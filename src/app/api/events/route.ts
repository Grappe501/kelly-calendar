import { z } from "zod";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
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
  isAllDay: z.boolean().optional(),
  city: z.string().optional(),
  countyId: z.string().optional(),
  venueName: z.string().optional(),
  streetAddress: z.string().optional(),
  locationNotes: z.string().optional(),
  virtualMeetingUrl: z.string().url().or(z.literal("")).optional(),
  locationDisclosure: z
    .enum(["EXACT", "VENUE", "CITY", "COUNTY", "REGION", "HIDDEN"])
    .optional(),
  defaultVisibility: z
    .enum([
      "FULL",
      "LIMITED",
      "TITLE_LOCATION",
      "BUSY_WITH_CATEGORY",
      "BUSY_ONLY",
      "CAMPAIGN_AUTHENTICATED",
      "TEAM_ONLY",
      "LEADERSHIP_ONLY",
      "NAMED_USERS",
      "PUBLIC",
      "PROTECTED",
    ])
    .optional(),
  relatedCalendarIds: z.array(z.string()).optional(),
  candidateRole: z.string().optional(),
  privateNotes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().max(500).optional(),
  weeklyOccurrences: z.number().int().min(0).max(12).optional(),
});

export async function GET(request: Request) {
  return withAuthenticatedQuery(request, "/api/events", async ({ actor }) => {
    const events = await listEventsForActor(actor);
    return { events, candidateDataReady: getSharedAuthFlags().candidateDataReady };
  });
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(request, "/api/events", async ({ actor, requestId }) => {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      const { ValidationError } = await import("@/lib/security/safe-error");
      throw new ValidationError("Invalid event create payload.");
    }
    const { virtualMeetingUrl, ...rest } = parsed.data;
    const event = await createEvent({
      actor,
      data: {
        ...rest,
        virtualMeetingUrl: virtualMeetingUrl || undefined,
        requestId,
      },
    });
    return { event };
  });
}
