import type { Metadata } from "next";
import { CommunicationAuditView } from "@/components/communications/CommunicationAuditView";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCampaignCommunicationDetail } from "@/server/services/campaign-communications-service";

export const metadata: Metadata = {
  title: "Communication audit",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ communicationId: string }> };

export default async function CommunicationAuditPage({ params }: Ctx) {
  const { communicationId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/${communicationId}/audit`,
  );
  const detail = await getCampaignCommunicationDetail(communicationId, actor);
  return <CommunicationAuditView detail={detail} />;
}
