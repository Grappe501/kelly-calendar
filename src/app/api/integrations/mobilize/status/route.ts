import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getMobilizeIntegrationStatus } from "@/server/services/mobilize-integration-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/status",
    async ({ actor }) => getMobilizeIntegrationStatus(actor),
  );
}
