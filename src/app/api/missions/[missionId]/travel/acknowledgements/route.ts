import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError, NotFoundError } from "@/lib/security/safe-error";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import { acknowledgeMissionTravelIssue } from "@/server/services/mission-travel-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ missionId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/missions/[missionId]/travel/acknowledgements",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError(
          "Travel and Movement Operations requires campaign leadership access.",
        );
      }
      const mission = await getCampaignMissionById(missionId);
      if (!mission) throw new NotFoundError("Mission not found.");
      await requireAuthorized(actor, {
        action: "EVENT_EDIT",
        resource: { type: "event", id: mission.sourceEventId },
      });
      const body = await request.json().catch(() => null);
      const result = await acknowledgeMissionTravelIssue({
        missionId,
        actor,
        body,
      });
      return {
        model: result,
        created: result.ackCreated,
      };
    },
  );
}
