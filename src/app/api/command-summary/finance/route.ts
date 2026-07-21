import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { maybeGenerateFinanceOperationsAdvisory } from "@/server/services/finance-operations-ai";
import { getFinanceOperations } from "@/server/services/finance-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/finance",
    async ({ actor, requestId }) => {
      const data = await getFinanceOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateFinanceOperationsAdvisory({
        actor,
        finance: data.finance,
        requestId,
        enabled: wantAi,
      });
      return {
        finance: data.finance,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
