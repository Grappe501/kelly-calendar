import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { maybeGenerateCampaignBriefAdvisory } from "@/server/services/campaign-brief-ai";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/command-summary/brief",
    async ({ actor, requestId }) => {
      const data = await getCampaignBrief(actor);
      const url = new URL(request.url);
      const wantAi = url.searchParams.get("advisory") === "1";
      const advisory = await maybeGenerateCampaignBriefAdvisory({
        actor,
        brief: data.brief,
        requestId,
        enabled: wantAi,
      });
      return {
        brief: data.brief,
        advisory,
        viewerDisplayName: data.viewerDisplayName,
        candidateDataReady: getSharedAuthFlags().candidateDataReady,
      };
    },
  );
}
