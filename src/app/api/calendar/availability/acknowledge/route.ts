import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { acknowledgeAvailability } from "@/server/services/availability-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  campaignKey: z.string().min(1).max(80).optional(),
  eventId: z.string().min(1).nullable().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timezone: z.string().min(1).max(80).default("America/Chicago"),
  isAllDay: z.boolean().optional().default(false),
  eventStatus: z.string().max(40).optional(),
  disposition: z.enum(["ACKNOWLEDGED", "ACCEPTED_RISK"]),
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/availability/acknowledge",
    async ({ actor, requestId }) => {
      const parsed = bodySchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new ValidationError("Invalid availability acknowledge payload.");
      }
      return acknowledgeAvailability({ actor, ...parsed.data, requestId });
    },
  );
}
