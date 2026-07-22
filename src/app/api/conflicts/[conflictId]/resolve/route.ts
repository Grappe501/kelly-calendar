import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { resolveConflict } from "@/server/services/authenticated-ops-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ conflictId: string }> };

/**
 * CC-06 RESOLVED disposition. Reason is optional only when a fresh
 * recompute confirms the conflict is no longer detected — otherwise the
 * service requires an explicit reason.
 */
export async function POST(request: Request, context: Ctx) {
  const { conflictId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/conflicts/[conflictId]/resolve",
    async ({ actor, requestId }) => {
      const body = z
        .object({ reason: z.string().optional() })
        .safeParse(await request.json().catch(() => ({})));
      return resolveConflict({
        actor,
        conflictId,
        reason: body.success ? body.data.reason : undefined,
        requestId,
      });
    },
  );
}
