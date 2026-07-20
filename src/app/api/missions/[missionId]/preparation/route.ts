import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import {
  getPrepareWorkspace,
  patchMissionPreparation,
} from "@/server/services/mission-preparation-service";
import { NotFoundError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ missionId: string }> };

async function authorizeMissionPrep(
  actor: Parameters<typeof requireAuthorized>[0],
  missionId: string,
  mutate: boolean,
) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError("Prepare Mode requires campaign leadership access.");
  }
  const mission = await getCampaignMissionById(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");
  await requireAuthorized(actor, {
    action: mutate ? "EVENT_EDIT" : "EVENT_VIEW",
    resource: { type: "event", id: mission.sourceEventId },
  });
}

export async function GET(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/missions/[missionId]/preparation",
    async ({ actor }) => {
      await authorizeMissionPrep(actor, missionId, false);
      return getPrepareWorkspace(missionId, actor);
    },
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/missions/[missionId]/preparation",
    async ({ actor }) => {
      await authorizeMissionPrep(actor, missionId, true);
      const body = await request.json().catch(() => null);
      return patchMissionPreparation(missionId, actor, body);
    },
  );
}
