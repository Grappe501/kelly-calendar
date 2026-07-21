import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveTestDetailPanel } from "@/components/communications/live-tests/LiveTestDetailPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getLiveTestDetail } from "@/server/services/communications-live-test-service";

export const metadata: Metadata = {
  title: "Live test detail",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ programId: string }> };

export default async function LiveTestDetailPage({ params }: Props) {
  const { programId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/live-tests/${programId}`,
  );
  try {
    const initial = await getLiveTestDetail(actor, programId);
    return <LiveTestDetailPanel initial={initial} />;
  } catch {
    notFound();
  }
}
