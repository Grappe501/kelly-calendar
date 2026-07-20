import type { Metadata } from "next";
import { CommunicationContentReview } from "@/components/communications/CommunicationContentReview";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCampaignCommunicationDetail } from "@/server/services/campaign-communications-service";

export const metadata: Metadata = {
  title: "Communication content",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ communicationId: string }> };

export default async function CommunicationContentPage({ params }: Ctx) {
  const { communicationId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/${communicationId}/content`,
  );
  const initial = await getCampaignCommunicationDetail(communicationId, actor);
  return <CommunicationContentReview initial={initial} />;
}
