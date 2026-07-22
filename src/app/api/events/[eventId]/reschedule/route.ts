import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { rescheduleEvent } from "@/server/services/event-lifecycle-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

const bodySchema = z.object({
  expectedVersion: z.number().int().positive(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timezone: z.string().optional(),
  scope: z.enum(["this", "this_and_future", "series"]).optional(),
  availabilityAcknowledgement: z
    .object({
      disposition: z.enum(["ACKNOWLEDGED", "ACCEPTED_RISK"]),
      reason: z.string().max(500).optional(),
      evaluationFingerprint: z.string().min(1),
    })
    .optional(),
});

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/reschedule",
    async ({ actor, requestId }) => {
      const parsed = bodySchema.safeParse(await request.json());
      if (!parsed.success) throw new ValidationError("Invalid reschedule payload.");
      return rescheduleEvent({
        actor,
        eventId,
        ...parsed.data,
        requestId,
      });
    },
  );
}
