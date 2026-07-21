import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AudienceDetailPanel } from "@/components/communications/audiences/AudienceDetailPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getAudienceDetail } from "@/server/services/communications-audience-service";

export const metadata: Metadata = {
  title: "Audience detail",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ audienceId: string }> };

export default async function AudienceDetailPage({ params }: Props) {
  const { audienceId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/audiences/${audienceId}`,
  );
  try {
    const initial = await getAudienceDetail(actor, audienceId);
    return <AudienceDetailPanel initial={initial} />;
  } catch {
    notFound();
  }
}
