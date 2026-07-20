import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getMobilizeSyncRun } from "@/server/services/mobilize-integration-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ runId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { runId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/runs/[runId]",
    async ({ actor }) => getMobilizeSyncRun(actor, runId),
  );
}
