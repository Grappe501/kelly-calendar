import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getHealthRun } from "@/server/services/calendar-health-service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ runId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { runId } = await params;
  return withAuthenticatedQuery(
    request,
    `/api/calendar/health/runs/${runId}`,
    async ({ actor }) => getHealthRun(actor, runId),
  );
}
