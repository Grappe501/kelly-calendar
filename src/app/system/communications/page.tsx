import type { Metadata } from "next";
import { CommunicationsListView } from "@/components/communications/CommunicationsListView";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { listCampaignCommunications } from "@/server/services/campaign-communications-service";

export const metadata: Metadata = {
  title: "Communications queue",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CommunicationsListPage() {
  const actor = await requireSystemAdminPage("/system/communications");
  const initial = await listCampaignCommunications(actor);
  return <CommunicationsListView initial={initial} />;
}
