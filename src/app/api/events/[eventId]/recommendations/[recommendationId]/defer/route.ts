import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { decideRecommendationForEvent } from "@/server/services/authenticated-ops-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string; recommendationId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId, recommendationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/recommendations/[recommendationId]/defer",
    async ({ actor, requestId }) => {
      const body = z
        .object({ reason: z.string().optional() })
        .safeParse(await request.json().catch(() => ({})));
      return decideRecommendationForEvent({
        actor,
        eventId,
        recommendationId,
        decision: "DEFERRED",
        reason: body.success ? body.data.reason : undefined,
        requestId,
      });
    },
  );
}
