import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { acknowledgeConflict } from "@/server/services/authenticated-ops-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ conflictId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { conflictId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/conflicts/[conflictId]/acknowledge",
    async ({ actor, requestId }) => {
      const body = z
        .object({ reason: z.string().optional() })
        .safeParse(await request.json().catch(() => ({})));
      return acknowledgeConflict({
        actor,
        conflictId,
        reason: body.success ? body.data.reason : undefined,
        requestId,
      });
    },
  );
}
