import type { Metadata } from "next";
import { CommunicationQueueBoard } from "@/components/communications/queue/CommunicationQueueBoard";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCampaignCommunicationDetail } from "@/server/services/campaign-communications-service";

export const metadata: Metadata = {
  title: "Communication queue",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ communicationId: string }> };

export default async function CommunicationQueuePage({ params }: Ctx) {
  const { communicationId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/${communicationId}/queue`,
  );
  const initial = await getCampaignCommunicationDetail(communicationId, actor);
  return <CommunicationQueueBoard initial={initial} />;
}
