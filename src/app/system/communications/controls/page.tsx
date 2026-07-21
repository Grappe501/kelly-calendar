import type { Metadata } from "next";
import { ControlsPanel } from "@/components/communications/dispatch/ControlsPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getDispatchControls } from "@/server/services/communications-dispatch-service";

export const metadata: Metadata = {
  title: "Dispatch controls",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ControlsPage() {
  const actor = await requireSystemAdminPage("/system/communications/controls");
  const initial = await getDispatchControls(actor);
  return <ControlsPanel initial={initial} />;
}
