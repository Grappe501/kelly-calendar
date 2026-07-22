import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { markConflictNotApplicable } from "@/server/services/authenticated-ops-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ conflictId: string }> };

/** CC-06 NOT_APPLICABLE disposition — always requires a reason. */
export async function POST(request: Request, context: Ctx) {
  const { conflictId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/conflicts/[conflictId]/not-applicable",
    async ({ actor, requestId }) => {
      const body = z
        .object({ reason: z.string().min(1) })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("A reason is required.");
      return markConflictNotApplicable({
        actor,
        conflictId,
        reason: body.data.reason,
        requestId,
      });
    },
  );
}
