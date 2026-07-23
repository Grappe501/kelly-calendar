import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listAlerts } from "@/server/services/calendar-health-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/health/alerts",
    async ({ actor }) => {
      const url = new URL(request.url);
      const includeResolved = url.searchParams.get("includeResolved") === "1";
      const alerts = await listAlerts(actor, { includeResolved });
      return { alerts };
    },
  );
}
