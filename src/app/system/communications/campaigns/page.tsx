import type { Metadata } from "next";
import { CampaignWorkspaceHome } from "@/components/communications/campaigns/CampaignWorkspaceHome";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCampaignWorkspaceHome } from "@/server/services/communications-campaign-service";

export const metadata: Metadata = {
  title: "Campaigns",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const actor = await requireSystemAdminPage(
    "/system/communications/campaigns",
  );
  const initial = await getCampaignWorkspaceHome(actor);
  return <CampaignWorkspaceHome initial={initial} />;
}
