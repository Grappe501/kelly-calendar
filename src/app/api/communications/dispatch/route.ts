import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listDispatchHistory } from "@/server/services/communications-dispatch-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/dispatch",
    async ({ actor }) => listDispatchHistory(actor),
  );
}
