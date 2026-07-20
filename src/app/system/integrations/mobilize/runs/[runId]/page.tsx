import type { Metadata } from "next";
import { MobilizeRunDetailClient } from "@/components/integrations/MobilizeRunDetailClient";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const metadata: Metadata = {
  title: "Mobilize sync run",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ runId: string }> };

export default async function MobilizeRunDetailPage({ params }: Props) {
  const { runId } = await params;
  await requireSystemAdminPage(`/system/integrations/mobilize/runs/${runId}`);
  return <MobilizeRunDetailClient />;
}
