import type { Metadata } from "next";
import { SuppressionsView } from "@/components/communications/SuppressionsView";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { listSuppressionsView } from "@/server/services/campaign-communications-service";

export const metadata: Metadata = {
  title: "Communication suppressions",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SuppressionsPage() {
  const actor = await requireSystemAdminPage("/system/communications/suppressions");
  const initial = await listSuppressionsView(actor);
  return <SuppressionsView initial={initial} />;
}
