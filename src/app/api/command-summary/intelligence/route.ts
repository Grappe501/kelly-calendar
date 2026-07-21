import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { maybeGenerateIntelligenceOperationsAdvisory } from "@/server/services/intelligence-operations-ai";
import { getOperationalIntelligence } from "@/server/services/intelligence-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/intelligence",
    async ({ actor, requestId }) => {
      const data = await getOperationalIntelligence(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateIntelligenceOperationsAdvisory({
        actor,
        intelligence: data.intelligence,
        requestId,
        enabled: wantAi,
      });
      return {
        intelligence: data.intelligence,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
