import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { maybeGenerateLogisticsOperationsAdvisory } from "@/server/services/logistics-operations-ai";
import { getLogisticsOperations } from "@/server/services/logistics-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/logistics",
    async ({ actor, requestId }) => {
      const data = await getLogisticsOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateLogisticsOperationsAdvisory({
        actor,
        logistics: data.logistics,
        requestId,
        enabled: wantAi,
      });
      return {
        logistics: data.logistics,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
