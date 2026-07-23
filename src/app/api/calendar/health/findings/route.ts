import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listFindings } from "@/server/services/calendar-health-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/health/findings",
    async ({ actor }) => {
      const url = new URL(request.url);
      const findings = await listFindings(actor, {
        runId: url.searchParams.get("runId") ?? undefined,
        domain: url.searchParams.get("domain") ?? undefined,
        limit: Number(url.searchParams.get("limit") ?? "100") || 100,
      });
      return { findings };
    },
  );
}
