import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { cancelEvent } from "@/server/services/event-lifecycle-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

const bodySchema = z.object({
  expectedVersion: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/cancel",
    async ({ actor, requestId }) => {
      const parsed = bodySchema.safeParse(await request.json());
      if (!parsed.success) throw new ValidationError("Invalid cancel payload.");
      const event = await cancelEvent({
        actor,
        eventId,
        expectedVersion: parsed.data.expectedVersion,
        reason: parsed.data.reason,
        requestId,
      });
      return { event };
    },
  );
}
