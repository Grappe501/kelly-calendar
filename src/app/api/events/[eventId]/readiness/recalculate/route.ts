import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { recalculateAndPersistReadiness } from "@/server/services/authenticated-ops-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/readiness/recalculate",
    async ({ actor, requestId }) =>
      recalculateAndPersistReadiness({ actor, eventId, requestId }),
  );
}
