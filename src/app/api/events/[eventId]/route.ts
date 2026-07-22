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
  status: z
    .enum([
      "DRAFT",
      "REQUESTED",
      "TENTATIVE",
      "HOLD",
      "UNDER_REVIEW",
      "APPROVED",
      "CONFIRMED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "DECLINED",
      "POSTPONED",
      "ARCHIVED",
    ])
    .optional(),
  statusChangeReason: z.string().max(500).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  timezone: z.string().optional(),
  isAllDay: z.boolean().optional(),
  city: z.string().nullable().optional(),
  countyId: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  streetAddress: z.string().nullable().optional(),
  locationNotes: z.string().nullable().optional(),
  virtualMeetingUrl: z.string().nullable().optional(),
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
  candidateRole: z.string().nullable().optional(),
  privateNotes: z.string().nullable().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().nullable().optional(),
  recurrenceSeriesId: z.string().nullable().optional(),
  availabilityAcknowledgement: z
    .object({
      disposition: z.enum(["ACKNOWLEDGED", "ACCEPTED_RISK"]),
      reason: z.string().max(500).optional(),
      evaluationFingerprint: z.string().min(1),
    })
    .optional(),
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
      const result = await updateEvent({
        actor,
        eventId,
        data: { ...parsed.data, requestId },
      });
      return result;
    },
  );
}
