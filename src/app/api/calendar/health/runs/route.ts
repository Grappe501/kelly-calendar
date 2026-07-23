import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listHealthRuns } from "@/server/services/calendar-health-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/health/runs",
    async ({ actor }) => {
      const url = new URL(request.url);
      const limit = Number(url.searchParams.get("limit") ?? "30");
      const runs = await listHealthRuns(
        actor,
        Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 30,
      );
      return { runs };
    },
  );
}
