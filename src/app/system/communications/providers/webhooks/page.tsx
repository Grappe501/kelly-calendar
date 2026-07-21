import type { Metadata } from "next";
import { WebhookInspectorPanel } from "@/components/communications/providers/WebhookInspectorPanel";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { getWebhookInspector } from "@/server/services/communications-provider-service";

export const metadata: Metadata = {
  title: "Webhook inspector",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WebhookInspectorPage() {
  const actor = await requireSystemAdminPage(
    "/system/communications/providers/webhooks",
  );
  const initial = await getWebhookInspector(actor);
  return <WebhookInspectorPanel initial={initial} />;
}
