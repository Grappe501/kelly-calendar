import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignDetailPanel } from "@/components/communications/campaigns/CampaignDetailPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCampaignDetail } from "@/server/services/communications-campaign-service";

export const metadata: Metadata = {
  title: "Campaign detail",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ campaignId: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const { campaignId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/campaigns/${campaignId}`,
  );
  try {
    const initial = await getCampaignDetail(actor, campaignId);
    return <CampaignDetailPanel initial={initial} />;
  } catch {
    notFound();
  }
}
