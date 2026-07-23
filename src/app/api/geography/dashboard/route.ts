import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getGeographyDashboard } from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/geography/dashboard",
    async ({ actor }) => getGeographyDashboard(actor),
  );
}
