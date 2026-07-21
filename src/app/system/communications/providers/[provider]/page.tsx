import type { Metadata } from "next";
import { ProviderDetailView } from "@/components/communications/dispatch/ProviderDetailView";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getProviderDetail } from "@/server/services/communications-dispatch-service";

export const metadata: Metadata = {
  title: "Communication provider detail",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

export default async function ProviderDetailPage({ params }: Ctx) {
  const { provider } = await params;
  const actor = await requireSystemAdminPage(
    `/system/communications/providers/${provider}`,
  );
  const initial = await getProviderDetail(provider, actor);
  return <ProviderDetailView providerKey={provider} initial={initial} />;
}
