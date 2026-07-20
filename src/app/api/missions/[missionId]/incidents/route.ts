import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError, NotFoundError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import {
  createMissionIncident,
  getMissionIncidentsWorkspace,
} from "@/server/services/mission-incident-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ missionId: string }> };

async function authorize(
  actor: Parameters<typeof requireAuthorized>[0],
  missionId: string,
  mutate: boolean,
) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Mission Incident Log requires campaign leadership access.",
    );
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
    "/api/missions/[missionId]/incidents",
    async ({ actor }) => {
      await authorize(actor, missionId, false);
      return getMissionIncidentsWorkspace(missionId, actor);
    },
  );
}

export async function POST(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/missions/[missionId]/incidents",
    async ({ actor }) => {
      await authorize(actor, missionId, true);
      const body = await request.json().catch(() => null);
      return {
        model: await createMissionIncident({ missionId, actor, body }),
      };
    },
  );
}
