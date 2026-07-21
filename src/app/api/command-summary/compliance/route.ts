import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { maybeGenerateComplianceOperationsAdvisory } from "@/server/services/compliance-operations-ai";
import { getComplianceOperations } from "@/server/services/compliance-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/compliance",
    async ({ actor, requestId }) => {
      const data = await getComplianceOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateComplianceOperationsAdvisory({
        actor,
        compliance: data.compliance,
        requestId,
        enabled: wantAi,
      });
      return {
        compliance: data.compliance,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
