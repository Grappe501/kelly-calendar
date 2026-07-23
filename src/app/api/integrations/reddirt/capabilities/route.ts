import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getRedDirtIntegrationStatus } from "@/server/services/reddirt-integration-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/integrations/reddirt/capabilities",
    async ({ actor }) => {
      const status = await getRedDirtIntegrationStatus(actor);
      return status.capabilities;
    },
  );
}
