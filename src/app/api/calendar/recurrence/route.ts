import { z } from "zod";
import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import {
  previewRecurrenceSeries,
  createRecurringSeries,
} from "@/server/services/recurrence-series-service";
import { getSafeEventForViewer } from "@/server/services/event-service";

export const dynamic = "force-dynamic";

const previewSchema = z.object({
  rrule: z.string().min(1).max(500),
  dtstartLocal: z.string().min(8).max(32),
  timezone: z.string().min(1).max(80).default("America/Chicago"),
  isAllDay: z.boolean().default(false),
  durationMinutes: z.number().int().positive().max(60 * 24 * 14),
  maxOccurrences: z.number().int().positive().max(52).optional(),
  exdatesLocal: z.array(z.string()).max(52).optional(),
});

const createSchema = z.object({
  primaryCalendarId: z.string().min(1),
  internalTitle: z.string().min(1).max(300),
  campaignDisplayTitle: z.string().max(300).optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  timezone: z.string().optional(),
  isAllDay: z.boolean().optional(),
  recurrenceRule: z.string().min(1).max(500),
  materializeCount: z.number().int().min(1).max(52).optional(),
  untilLocal: z.string().optional(),
  exdatesLocal: z.array(z.string()).max(52).optional(),
  city: z.string().optional(),
  venueName: z.string().optional(),
  status: z
    .enum(["DRAFT", "HOLD", "TENTATIVE", "CONFIRMED", "REQUESTED"])
    .optional(),
});

export async function POST(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "create";

  if (mode === "preview") {
    return withAuthenticatedMutation(
      request,
      "/api/calendar/recurrence?mode=preview",
      async ({ actor }) => {
        const parsed = previewSchema.safeParse(await request.json());
        if (!parsed.success) {
          throw new ValidationError("Invalid recurrence preview payload.");
        }
        const preview = await previewRecurrenceSeries(parsed.data);
        return { preview, actorId: actor.userId };
      },
    );
  }

  return withAuthenticatedMutation(
    request,
    "/api/calendar/recurrence",
    async ({ actor, requestId }) => {
      const parsed = createSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new ValidationError("Invalid recurrence create payload.");
      }
      const result = await createRecurringSeries({
        actor,
        data: {
          primaryCalendarId: parsed.data.primaryCalendarId,
          internalTitle: parsed.data.internalTitle,
          campaignDisplayTitle: parsed.data.campaignDisplayTitle,
          startsAt: parsed.data.startsAt,
          endsAt: parsed.data.endsAt,
          timezone: parsed.data.timezone,
          isAllDay: parsed.data.isAllDay,
          recurrenceRule: parsed.data.recurrenceRule,
          materializeCount: parsed.data.materializeCount,
          untilLocal: parsed.data.untilLocal,
          exdatesLocal: parsed.data.exdatesLocal,
          city: parsed.data.city,
          venueName: parsed.data.venueName,
          status: parsed.data.status,
          requestId,
        },
        requestId,
      });
      const event = result.firstEventId
        ? await getSafeEventForViewer({
            eventId: result.firstEventId,
            viewerUserId: actor.userId,
            viewerAccess: "FULL",
          })
        : null;
      return { ...result, event };
    },
  );
}

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/recurrence",
    async () => ({
      doctrine: "CC-04-RECURRENCE-1.0",
      authorityModel: "B_SERIES_PLUS_MATERIALIZED_EVENTS",
      limits: {
        maxPreview: 52,
        maxMaterialize: 52,
        maxRangeDays: 400,
        defaultHorizonDays: 90,
      },
    }),
  );
}
