import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSeriesWorkspace } from "@/server/services/recurrence-series-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ seriesId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { seriesId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/calendar/series/[seriesId]",
    async ({ actor }) => {
      const workspace = await getSeriesWorkspace({ actor, seriesId });
      return { workspace };
    },
  );
}
