import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { maybeGenerateFundraisingOperationsAdvisory } from "@/server/services/fundraising-operations-ai";
import { getFundraisingOperations } from "@/server/services/fundraising-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/fundraising",
    async ({ actor, requestId }) => {
      const data = await getFundraisingOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateFundraisingOperationsAdvisory({
        actor,
        fundraising: data.fundraising,
        requestId,
        enabled: wantAi,
      });
      return {
        fundraising: data.fundraising,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: false as const,
      };
    },
  );
}
