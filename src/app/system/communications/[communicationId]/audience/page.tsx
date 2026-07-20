import type { Metadata } from "next";
import { CommunicationAudienceReview } from "@/components/communications/CommunicationAudienceReview";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCampaignCommunicationDetail } from "@/server/services/campaign-communications-service";

export const metadata: Metadata = {
  title: "Communication audience",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ communicationId: string }> };

export default async function CommunicationAudiencePage({ params }: Ctx) {
  const { communicationId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/${communicationId}/audience`,
  );
  const initial = await getCampaignCommunicationDetail(communicationId, actor);
  return <CommunicationAudienceReview initial={initial} />;
}
