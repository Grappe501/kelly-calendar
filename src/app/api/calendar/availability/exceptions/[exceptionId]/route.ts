import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import { cancelException } from "@/server/services/availability-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ exceptionId: string }> };

const patchSchema = z.object({
  op: z.literal("cancel").default("cancel"),
  reason: z.string().max(500).optional(),
});

export async function PATCH(request: Request, context: Ctx) {
  const { exceptionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/calendar/availability/exceptions/[exceptionId]",
    async ({ actor, requestId }) => {
      const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
      if (!parsed.success) throw new ValidationError("Invalid exception update payload.");
      return cancelException({
        actor,
        exceptionId,
        reason: parsed.data.reason,
        requestId,
      });
    },
  );
}
