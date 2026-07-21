import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getWebhookInspector } from "@/server/services/communications-provider-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/providers/webhooks",
    async ({ actor }) => getWebhookInspector(actor),
  );
}
