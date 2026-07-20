import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getAttendanceRunDetail } from "@/server/services/mobilize-attendance-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ runId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { runId } = await ctx.params;
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/attendance/runs/[runId]",
    async ({ actor }) => getAttendanceRunDetail(actor, runId),
  );
}
