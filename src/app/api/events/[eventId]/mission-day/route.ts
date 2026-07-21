import { z } from "zod";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { applyMissionDayAction } from "@/server/services/mission-day-action-service";
import { isMissionDayAction } from "@/lib/missions/mission-day-actions";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

const bodySchema = z.object({
  action: z.string().min(1),
  expectedVersion: z.number().int().positive(),
});

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/mission-day",
    async ({ actor, requestId }) => {
      const parsed = bodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        throw new ValidationError("action and expectedVersion are required.");
      }
      if (!isMissionDayAction(parsed.data.action)) {
        throw new ValidationError("Unsupported mission day action.");
      }
      const result = await applyMissionDayAction({
        actor,
        eventId,
        action: parsed.data.action,
        expectedVersion: parsed.data.expectedVersion,
        requestId,
      });
      return { missionDay: result, candidateDataReady: getSharedAuthFlags().candidateDataReady };
    },
  );
}
