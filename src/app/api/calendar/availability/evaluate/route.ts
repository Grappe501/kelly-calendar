import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { evaluateProposedInterval } from "@/server/services/availability-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  campaignKey: z.string().min(1).max(80).optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timezone: z.string().min(1).max(80).default("America/Chicago"),
  isAllDay: z.boolean().optional().default(false),
  eventStatus: z.string().max(40).optional(),
  acknowledgement: z
    .object({
      disposition: z.enum(["ACKNOWLEDGED", "ACCEPTED_RISK"]),
      reason: z.string().max(500).optional(),
      evaluationFingerprint: z.string().min(1),
    })
    .optional(),
});

/**
 * Preview-only evaluation — does not record acknowledgement or gate a save.
 * `acknowledgement` is accepted for symmetry with the save-path payload but
 * is not required or persisted here.
 */
export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/availability/evaluate",
    async ({ actor }) => {
      const parsed = bodySchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new ValidationError("Invalid availability evaluate payload.");
      }
      const assessment = await evaluateProposedInterval({
        actor,
        campaignKey: parsed.data.campaignKey,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        timezone: parsed.data.timezone,
        isAllDay: parsed.data.isAllDay,
        eventStatus: parsed.data.eventStatus,
      });
      return { assessment };
    },
  );
}
