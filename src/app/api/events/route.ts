import { z } from "zod";
import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { createEvent, listEventsForActor } from "@/server/services/event-service";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  primaryCalendarId: z.string().min(1),
  internalTitle: z.string().min(1).max(300),
  campaignDisplayTitle: z.string().max(300).optional(),
  publicTitle: z.string().max(300).optional(),
  eventType: z.string().max(120).optional(),
  status: z
    .enum([
      "DRAFT",
      "REQUESTED",
      "TENTATIVE",
      "HOLD",
      "UNDER_REVIEW",
      "APPROVED",
      "CONFIRMED",
    ])
    .optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timezone: z.string().optional(),
  city: z.string().optional(),
  countyId: z.string().optional(),
  venueName: z.string().optional(),
  relatedCalendarIds: z.array(z.string()).optional(),
  candidateRole: z.string().optional(),
});

export async function GET(request: Request) {
  return withAuthenticatedQuery(request, "/api/events", async ({ actor }) => {
    const events = await listEventsForActor(actor);
    return { events, candidateDataReady: false };
  });
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(request, "/api/events", async ({ actor, requestId }) => {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      const { ValidationError } = await import("@/lib/security/safe-error");
      throw new ValidationError("Invalid event create payload.");
    }
    const event = await createEvent({
      actor,
      data: { ...parsed.data, requestId },
    });
    return { event };
  });
}
