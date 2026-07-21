import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getProviderMetricsPanel } from "@/server/services/communications-provider-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/providers/gates",
    async ({ actor }) => getProviderMetricsPanel(actor),
  );
}
