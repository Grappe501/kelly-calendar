import { CampaignBriefView } from "@/components/brief/CampaignBriefView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { maybeGenerateCampaignBriefAdvisory } from "@/server/services/campaign-brief-ai";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ advisory?: string }>;
};

export default async function CampaignBriefPage({ searchParams }: Props) {
  const actor = await requireActiveAuthenticatedActor();
  const params = searchParams ? await searchParams : {};
  const wantAi = params.advisory === "1";
  const data = await getCampaignBrief(actor);
  const advisory = await maybeGenerateCampaignBriefAdvisory({
    actor,
    brief: data.brief,
    enabled: wantAi,
  });

  return (
    <CampaignBriefView
      brief={data.brief}
      advisory={advisory}
      viewerDisplayName={data.viewerDisplayName}
    />
  );
}
