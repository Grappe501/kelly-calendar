import type { Metadata } from "next";
import { CompositionWorkspaceHome } from "@/components/communications/composition/CompositionWorkspaceHome";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCompositionWorkspaceHome } from "@/server/services/communications-composition-service";

export const metadata: Metadata = {
  title: "Compositions",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CompositionsPage() {
  const actor = await requireSystemAdminPage(
    "/system/communications/compositions",
  );
  const initial = await getCompositionWorkspaceHome(actor);
  return <CompositionWorkspaceHome initial={initial} />;
}
