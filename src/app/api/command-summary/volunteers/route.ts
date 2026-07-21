import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { maybeGenerateVolunteerOperationsAdvisory } from "@/server/services/volunteer-operations-ai";
import { getVolunteerOperations } from "@/server/services/volunteer-operations-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/volunteers",
    async ({ actor, requestId }) => {
      const data = await getVolunteerOperations(actor);
      const wantAi = new URL(request.url).searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateVolunteerOperationsAdvisory({
        actor,
        volunteers: data.volunteers,
        requestId,
        enabled: wantAi,
      });
      return {
        volunteers: data.volunteers,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
