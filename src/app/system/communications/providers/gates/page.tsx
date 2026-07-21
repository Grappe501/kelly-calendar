import type { Metadata } from "next";
import { ProductionGatesPanel } from "@/components/communications/providers/ProductionGatesPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getProviderMetricsPanel } from "@/server/services/communications-provider-service";

export const metadata: Metadata = {
  title: "Production gates",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProductionGatesPage() {
  const actor = await requireSystemAdminPage(
    "/system/communications/providers/gates",
  );
  const initial = await getProviderMetricsPanel(actor);
  return <ProductionGatesPanel initial={initial} />;
}
