import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManifestDetailPanel } from "@/components/communications/audiences/ManifestDetailPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getManifestDetail } from "@/server/services/communications-audience-service";

export const metadata: Metadata = {
  title: "Recipient manifest",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ audienceId: string; manifestId: string }>;
};

export default async function ManifestPage({ params }: Props) {
  const { audienceId, manifestId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/audiences/${audienceId}/manifests/${manifestId}`,
  );
  try {
    const initial = await getManifestDetail(actor, manifestId);
    return <ManifestDetailPanel audienceId={audienceId} initial={initial} />;
  } catch {
    notFound();
  }
}
