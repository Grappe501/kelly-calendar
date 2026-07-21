import type { Metadata } from "next";
import { ProviderHealthDashboard } from "@/components/communications/providers/ProviderHealthDashboard";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getProviderHealthDashboard } from "@/server/services/communications-provider-service";

export const metadata: Metadata = {
  title: "Provider health",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProviderHealthPage() {
  const actor = await requireSystemAdminPage(
    "/system/communications/providers/health",
  );
  const initial = await getProviderHealthDashboard(actor);
  return <ProviderHealthDashboard initial={initial} />;
}
