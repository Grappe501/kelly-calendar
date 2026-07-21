import type { Metadata } from "next";
import { DispatchBatchDetail } from "@/components/communications/dispatch/DispatchBatchDetail";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getDispatchBatchDetail } from "@/server/services/communications-dispatch-service";

export const metadata: Metadata = {
  title: "Dispatch batch detail",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ batchId: string }> };

export default async function DispatchBatchPage({ params }: Ctx) {
  const { batchId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/dispatch/${batchId}`,
  );
  const initial = await getDispatchBatchDetail(batchId, actor);
  return <DispatchBatchDetail initial={initial} />;
}
