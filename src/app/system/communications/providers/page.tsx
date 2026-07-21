import type { Metadata } from "next";
import { ProvidersDashboard } from "@/components/communications/dispatch/ProvidersDashboard";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getProvidersDashboard } from "@/server/services/communications-dispatch-service";

export const metadata: Metadata = {
  title: "Communication providers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const actor = await requireSystemAdminPage("/system/communications/providers");
  const initial = await getProvidersDashboard(actor);
  return <ProvidersDashboard initial={initial} />;
}
