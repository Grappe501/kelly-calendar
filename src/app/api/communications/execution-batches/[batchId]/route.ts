import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import {
  dispatchSandboxBatch,
  preflightBatch,
} from "@/server/services/communications-campaign-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ batchId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { batchId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/execution-batches/${batchId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action =
        typeof body?.action === "string" ? body.action : "preflight";
      if (action === "dispatch") return dispatchSandboxBatch(actor, batchId);
      return preflightBatch(actor, batchId);
    },
  );
}
