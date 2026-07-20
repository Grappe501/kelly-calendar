import type { Metadata } from "next";
import { PolicyViewPanel } from "@/components/communications/PolicyViewPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getCommunicationPolicyView } from "@/server/services/campaign-communications-service";

export const metadata: Metadata = {
  title: "Communication policy",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PolicyPage() {
  const actor = await requireSystemAdminPage("/system/communications/policy");
  const initial = await getCommunicationPolicyView(actor);
  return <PolicyViewPanel initial={initial} />;
}
