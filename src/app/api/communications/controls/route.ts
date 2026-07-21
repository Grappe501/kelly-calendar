import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  getDispatchControls,
  updateDispatchControls,
} from "@/server/services/communications-dispatch-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/controls",
    async ({ actor }) => getDispatchControls(actor),
  );
}

export async function PATCH(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/communications/controls",
    async ({ actor }) => {
      const body = await request.json().catch(() => null);
      return updateDispatchControls(actor, body);
    },
  );
}
