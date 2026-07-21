import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { maybeGenerateCandidateOperationsAdvisory } from "@/server/services/candidate-operations-ai";
import { getCandidateOperations } from "@/server/services/candidate-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/candidate",
    async ({ actor, requestId }) => {
      const data = await getCandidateOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateCandidateOperationsAdvisory({
        actor,
        candidate: data.candidate,
        requestId,
        enabled: wantAi,
      });
      return {
        candidate: data.candidate,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
