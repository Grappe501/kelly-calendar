import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listWebhookHistory } from "@/server/services/communications-dispatch-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/webhooks",
    async ({ actor }) => listWebhookHistory(actor),
  );
}
