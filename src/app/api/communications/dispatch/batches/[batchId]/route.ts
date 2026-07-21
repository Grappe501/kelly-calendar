import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getDispatchBatchDetail } from "@/server/services/communications-dispatch-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ batchId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { batchId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/communications/dispatch/batches/[batchId]",
    async ({ actor }) => getDispatchBatchDetail(batchId, actor),
  );
}
