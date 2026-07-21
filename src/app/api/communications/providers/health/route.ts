import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import { getProviderHealthDashboard } from "@/server/services/communications-provider-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/providers/health",
    async ({ actor }) => getProviderHealthDashboard(actor),
  );
}
