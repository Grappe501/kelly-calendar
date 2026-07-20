import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { NotFoundError, PermissionDeniedError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { findIncidentById } from "@/server/repositories/mission-incident-repository";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import {
  getIncidentDetail,
  patchMissionIncident,
} from "@/server/services/mission-incident-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ missionId: string; incidentId: string }> };

async function authorize(
  actor: Parameters<typeof requireAuthorized>[0],
  missionId: string,
  incidentId: string,
  mutate: boolean,
) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Mission Incident Log requires campaign leadership access.",
    );
  }
  const mission = await getCampaignMissionById(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");
  const incident = await findIncidentById(incidentId);
  if (!incident || incident.missionId !== missionId) {
    throw new NotFoundError("Mission incident not found.");
  }
  await requireAuthorized(actor, {
    action: mutate ? "EVENT_EDIT" : "EVENT_VIEW",
    resource: { type: "event", id: mission.sourceEventId },
  });
  return incident;
}

export async function GET(request: Request, context: Ctx) {
  const { missionId, incidentId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/missions/[missionId]/incidents/[incidentId]",
    async ({ actor }) => {
      await authorize(actor, missionId, incidentId, false);
      return getIncidentDetail(incidentId, actor);
    },
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { missionId, incidentId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/missions/[missionId]/incidents/[incidentId]",
    async ({ actor }) => {
      await authorize(actor, missionId, incidentId, true);
      const body = await request.json().catch(() => null);
      return {
        model: await patchMissionIncident({ incidentId, actor, body }),
      };
    },
  );
}
