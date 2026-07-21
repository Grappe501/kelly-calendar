import type { Metadata } from "next";
import { DispatchHistory } from "@/components/communications/dispatch/DispatchHistory";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { listDispatchHistory } from "@/server/services/communications-dispatch-service";

export const metadata: Metadata = {
  title: "Dispatch history",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DispatchHistoryPage() {
  const actor = await requireSystemAdminPage("/system/communications/dispatch");
  const initial = await listDispatchHistory(actor);
  return <DispatchHistory initial={initial} />;
}
