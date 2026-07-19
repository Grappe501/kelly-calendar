import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { maybeGenerateCommunicationsOperationsAdvisory } from "@/server/services/communications-operations-ai";
import { getCommunicationsOperations } from "@/server/services/communications-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/communications",
    async ({ actor, requestId }) => {
      const data = await getCommunicationsOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateCommunicationsOperationsAdvisory({
        actor,
        communications: data.communications,
        requestId,
        enabled: wantAi,
      });
      return {
        communications: data.communications,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: false as const,
      };
    },
  );
}
