import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { decideRecommendationForEvent } from "@/server/services/authenticated-ops-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string; recommendationId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId, recommendationId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/recommendations/[recommendationId]/modify",
    async ({ actor, requestId }) => {
      const body = z
        .object({
          modifiedValue: z.unknown(),
          reason: z.string().optional(),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("modifiedValue is required.");
      return decideRecommendationForEvent({
        actor,
        eventId,
        recommendationId,
        decision: "MODIFIED",
        modifiedValue: body.data.modifiedValue,
        reason: body.data.reason,
        requestId,
      });
    },
  );
}
