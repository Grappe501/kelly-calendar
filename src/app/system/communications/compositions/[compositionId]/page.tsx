import type { Metadata } from "next";
import { CompositionEditor } from "@/components/communications/composition/CompositionEditor";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCompositionDetail } from "@/server/services/communications-composition-service";

export const metadata: Metadata = {
  title: "Composition",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ compositionId: string }> };

export default async function CompositionDetailPage({ params }: Props) {
  const { compositionId } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/compositions/${compositionId}`,
  );
  const initial = await getCompositionDetail(actor, compositionId);
  return <CompositionEditor initial={initial} />;
}
