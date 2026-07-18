import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
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
        nextEvent: data.nextEvent,
        upcomingToday: data.upcomingToday,
        candidateDataReady: false,
      };
    },
  );
}
