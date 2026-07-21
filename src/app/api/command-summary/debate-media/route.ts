import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { maybeGenerateDebateMediaOperationsAdvisory } from "@/server/services/debate-media-operations-ai";
import { getDebateMediaOperations } from "@/server/services/debate-media-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/debate-media",
    async ({ actor, requestId }) => {
      const data = await getDebateMediaOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateDebateMediaOperationsAdvisory({
        actor,
        debateMedia: data.debateMedia,
        requestId,
        enabled: wantAi,
      });
      return {
        debateMedia: data.debateMedia,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
