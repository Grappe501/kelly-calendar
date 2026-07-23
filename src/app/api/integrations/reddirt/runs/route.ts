import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listRedDirtRuns } from "@/server/services/reddirt-integration-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/integrations/reddirt/runs",
    async ({ actor }) => listRedDirtRuns(actor),
  );
}
