import type { Metadata } from "next";
import { CompositionWorkspaceHome } from "@/components/communications/composition/CompositionWorkspaceHome";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCompositionWorkspaceHome } from "@/server/services/communications-composition-service";

export const metadata: Metadata = {
  title: "Briefs",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function BriefsPage() {
  const actor = await requireSystemAdminPage("/system/communications/briefs");
  const initial = await getCompositionWorkspaceHome(actor);
  return <CompositionWorkspaceHome initial={initial} />;
}
