import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { publishEvent } from "@/server/services/event-lifecycle-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

const bodySchema = z.object({
  expectedVersion: z.number().int().positive(),
  targetStatus: z.enum(["TENTATIVE", "HOLD", "CONFIRMED"]).optional(),
});

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/publish",
    async ({ actor, requestId }) => {
      const parsed = bodySchema.safeParse(await request.json());
      if (!parsed.success) throw new ValidationError("Invalid publish payload.");
      const event = await publishEvent({
        actor,
        eventId,
        expectedVersion: parsed.data.expectedVersion,
        targetStatus: parsed.data.targetStatus,
        requestId,
      });
      return { event };
    },
  );
}
