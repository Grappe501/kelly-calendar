import type { Metadata } from "next";
import { LiveTestWorkspaceHome } from "@/components/communications/live-tests/LiveTestWorkspaceHome";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getLiveTestWorkspaceHome } from "@/server/services/communications-live-test-service";

export const metadata: Metadata = {
  title: "Controlled live tests",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function LiveTestsPage() {
  const actor = await requireSystemAdminPage(
    "/system/communications/live-tests",
  );
  const initial = await getLiveTestWorkspaceHome(actor);
  return <LiveTestWorkspaceHome initial={initial} />;
}
