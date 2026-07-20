import type { Metadata } from "next";
import { CommunicationOverview } from "@/components/communications/CommunicationOverview";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCampaignCommunicationDetail } from "@/server/services/campaign-communications-service";

export const metadata: Metadata = {
  title: "Communication",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ communicationId: string }> };

export default async function CommunicationDetailPage({ params }: Ctx) {
  const { communicationId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/${communicationId}`,
  );
  const detail = await getCampaignCommunicationDetail(communicationId, actor);
  return <CommunicationOverview detail={detail} />;
}
