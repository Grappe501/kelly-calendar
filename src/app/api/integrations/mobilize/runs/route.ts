import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listMobilizeSyncRuns } from "@/server/services/mobilize-integration-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/runs",
    async ({ actor }) => listMobilizeSyncRuns(actor),
  );
}
