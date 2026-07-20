import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError, NotFoundError } from "@/lib/security/safe-error";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import {
  removeMissionTravelLeg,
  upsertMissionTravelLeg,
} from "@/server/services/mission-travel-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ missionId: string; legId: string }> };

async function authorize(actor: Parameters<typeof requireAuthorized>[0], missionId: string) {
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
}

export async function PATCH(request: Request, context: Ctx) {
  const { missionId, legId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/missions/[missionId]/travel/legs/[legId]",
    async ({ actor }) => {
      await authorize(actor, missionId);
      const body = await request.json().catch(() => null);
      return {
        model: await upsertMissionTravelLeg({
          missionId,
          actor,
          legId,
          body,
        }),
      };
    },
  );
}

export async function DELETE(request: Request, context: Ctx) {
  const { missionId, legId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/missions/[missionId]/travel/legs/[legId]",
    async ({ actor }) => {
      await authorize(actor, missionId);
      const body = await request.json().catch(() => ({}));
      return {
        model: await removeMissionTravelLeg({
          missionId,
          actor,
          legId,
          body,
        }),
      };
    },
  );
}
