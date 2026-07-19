import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { maybeGenerateCountyOperationsAdvisory } from "@/server/services/county-operations-ai";
import { getCountyOperations } from "@/server/services/county-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/counties",
    async ({ actor, requestId }) => {
      const data = await getCountyOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateCountyOperationsAdvisory({
        actor,
        counties: data.counties,
        requestId,
        enabled: wantAi,
      });
      return {
        counties: data.counties,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: false as const,
      };
    },
  );
}
