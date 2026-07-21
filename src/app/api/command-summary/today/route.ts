import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { getTodayCommandShellData } from "@/server/services/command-summary-today";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/today",
    async ({ actor }) => {
      const data = await getTodayCommandShellData(actor);
      return {
        summary: data.summary,
        todayReadiness: data.todayReadiness,
        nextMission: data.nextMission,
        missionsToday: data.missionsToday,
        nextEvent: data.nextEvent,
        upcomingToday: data.upcomingToday,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
