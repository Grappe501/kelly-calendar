import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { duplicateEvent } from "@/server/services/event-lifecycle-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/duplicate",
    async ({ actor, requestId }) => {
      const event = await duplicateEvent({ actor, eventId, requestId });
      return { event };
    },
  );
}
