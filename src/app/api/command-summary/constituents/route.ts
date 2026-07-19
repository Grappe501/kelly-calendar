import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { maybeGenerateConstituentOperationsAdvisory } from "@/server/services/constituent-operations-ai";
import { getConstituentOperations } from "@/server/services/constituent-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/constituents",
    async ({ actor, requestId }) => {
      const data = await getConstituentOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateConstituentOperationsAdvisory({
        actor,
        constituents: data.constituents,
        requestId,
        enabled: wantAi,
      });
      return {
        constituents: data.constituents,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: false as const,
      };
    },
  );
}
