import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { decideRecommendationForEvent } from "@/server/services/authenticated-ops-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string; recommendationId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId, recommendationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/recommendations/[recommendationId]/accept",
    async ({ actor, requestId }) =>
      decideRecommendationForEvent({
        actor,
        eventId,
        recommendationId,
        decision: "ACCEPTED",
        requestId,
      }),
  );
}
