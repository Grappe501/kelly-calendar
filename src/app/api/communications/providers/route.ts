import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  getProvidersDashboard,
  verifyActiveProviderConnection,
} from "@/server/services/communications-dispatch-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/providers",
    async ({ actor }) => getProvidersDashboard(actor),
  );
}

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/providers",
    async ({ actor }) => verifyActiveProviderConnection(actor),
  );
}
