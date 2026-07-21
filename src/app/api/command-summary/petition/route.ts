import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { maybeGeneratePetitionBallotOperationsAdvisory } from "@/server/services/petition-ballot-operations-ai";
import { getPetitionBallotOperations } from "@/server/services/petition-ballot-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/petition",
    async ({ actor, requestId }) => {
      const data = await getPetitionBallotOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGeneratePetitionBallotOperationsAdvisory({
        actor,
        petition: data.petition,
        requestId,
        enabled: wantAi,
      });
      return {
        petition: data.petition,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
