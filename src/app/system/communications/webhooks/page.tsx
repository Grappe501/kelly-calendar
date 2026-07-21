import type { Metadata } from "next";
import { WebhookHistory } from "@/components/communications/dispatch/WebhookHistory";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { listWebhookHistory } from "@/server/services/communications-dispatch-service";

export const metadata: Metadata = {
  title: "Communication webhooks",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const actor = await requireSystemAdminPage("/system/communications/webhooks");
  const initial = await listWebhookHistory(actor);
  return <WebhookHistory initial={initial} />;
}
