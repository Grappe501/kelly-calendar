import { z } from "zod";
import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSafeEventForViewer, updateEvent } from "@/server/services/event-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

const patchSchema = z.object({
  expectedVersion: z.number().int().positive(),
  internalTitle: z.string().min(1).max(300).optional(),
  campaignDisplayTitle: z.string().max(300).optional(),
  publicTitle: z.string().max(300).optional(),
  eventType: z.string().max(120).optional(),
  status: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  timezone: z.string().optional(),
  city: z.string().optional(),
  countyId: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  candidateRole: z.string().nullable().optional(),
  privateNotes: z.string().nullable().optional(),
});

export async function GET(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/events/[eventId]",
    async ({ actor }) => {
      const event = await getSafeEventForViewer({
        eventId,
        viewerUserId: actor.userId,
      });
      return { event };
    },
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]",
    async ({ actor, requestId }) => {
      const parsed = patchSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new ValidationError("Invalid event update payload.");
      }
      const event = await updateEvent({
        actor,
        eventId,
        data: { ...parsed.data, requestId, status: parsed.data.status as never },
      });
      return { event };
    },
  );
}
