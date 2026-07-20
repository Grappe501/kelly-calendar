import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import {
  acknowledgeMissionStaffingFinding,
  assignMissionStaffing,
  confirmMissionStaffingPlan,
  getMissionStaffingWorkspace,
  openMissionStaffingPlan,
  transitionMissionStaffingAssignment,
  upsertMissionStaffingRequirement,
} from "@/server/services/mission-staffing-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ missionId: string }> };

async function authorize(
  actor: Parameters<typeof requireAuthorized>[0],
  missionId: string,
  mutate: boolean,
) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Volunteer Staffing requires campaign leadership access.",
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
    "/api/missions/[missionId]/staffing",
    async ({ actor }) => {
      await authorize(actor, missionId, false);
      return getMissionStaffingWorkspace(missionId, actor);
    },
  );
}

export async function POST(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/missions/[missionId]/staffing",
    async ({ actor }) => {
      await authorize(actor, missionId, true);
      const body = await request.json().catch(() => null);
      return {
        model: await openMissionStaffingPlan(missionId, actor, body),
      };
    },
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/missions/[missionId]/staffing",
    async ({ actor }) => {
      await authorize(actor, missionId, true);
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action = typeof body?.action === "string" ? body.action : "";
      const payload = body?.payload;

      switch (action) {
        case "requirement":
          return {
            model: await upsertMissionStaffingRequirement(
              missionId,
              actor,
              payload,
            ),
          };
        case "assign":
          return {
            model: await assignMissionStaffing(missionId, actor, payload),
          };
        case "transition":
          return {
            model: await transitionMissionStaffingAssignment(
              missionId,
              actor,
              payload,
            ),
          };
        case "confirm":
          return {
            model: await confirmMissionStaffingPlan(missionId, actor),
          };
        case "acknowledge":
          return {
            model: await acknowledgeMissionStaffingFinding(
              missionId,
              actor,
              payload,
            ),
          };
        default:
          throw new ValidationError(
            "PATCH action must be requirement, assign, transition, confirm, or acknowledge.",
          );
      }
    },
  );
}
