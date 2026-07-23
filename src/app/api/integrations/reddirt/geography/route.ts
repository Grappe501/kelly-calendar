import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getRedDirtGeographySummary } from "@/server/services/reddirt-integration-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/integrations/reddirt/geography",
    async ({ actor }) => getRedDirtGeographySummary(actor),
  );
}
