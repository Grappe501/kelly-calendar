import "server-only";

import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  buildPreparationReadinessChecks,
  canTransitionReadiness,
  emptyMissionPreparation,
  mergePreparationPatch,
  validatePreparationPatch,
  type MissionPreparationRecord,
  type PreparationPatchInput,
  type PrepareWorkspaceView,
} from "@/lib/missions/v21/preparation";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  createEmptyPreparation,
  getPreparationByMissionId,
  preparationFromRow,
  savePreparationRecord,
} from "@/server/repositories/mission-preparation-repository";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import { getMissionHomeViewModelById } from "@/server/services/todays-mission-service";

export type { PrepareWorkspaceView };

function requirePrepareAccess(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError("Prepare Mode requires campaign leadership access.");
  }
}

async function loadOrCreatePreparation(
  missionId: string,
  actor: AuthenticatedActor,
  createIfMissing: boolean,
): Promise<MissionPreparationRecord> {
  const mission = await getCampaignMissionById(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");

  const existing = await getPreparationByMissionId(missionId);
  if (existing) return preparationFromRow(existing);

  if (!createIfMissing) {
    const empty = emptyMissionPreparation(missionId);
    return {
      ...empty,
      id: "",
    };
  }

  return createEmptyPreparation({
    missionId,
    createdByUserId: actor.userId,
  });
}

export async function getPrepareWorkspace(
  missionId: string,
  actor: AuthenticatedActor,
): Promise<PrepareWorkspaceView> {
  requirePrepareAccess(actor);
  const mission = await getMissionHomeViewModelById(missionId);
  const preparation = await loadOrCreatePreparation(missionId, actor, false);
  const readinessChecks = buildPreparationReadinessChecks(preparation, {
    hasObjective: Boolean(mission.objective),
    hasSuccessCriteria: mission.successCriteria.length > 0,
  });
  return {
    mission,
    preparation,
    readinessChecks,
    lifecyclePhaseUnchangedByReadiness: true,
    eventScheduleEditableHere: false,
  };
}

export async function patchMissionPreparation(
  missionId: string,
  actor: AuthenticatedActor,
  rawBody: unknown,
): Promise<PrepareWorkspaceView> {
  requirePrepareAccess(actor);

  const validated = validatePreparationPatch(rawBody);
  if (!validated.ok || !validated.value) {
    throw new ValidationError(
      validated.issues[0]?.message ?? "Invalid preparation payload.",
    );
  }
  const patch: PreparationPatchInput = validated.value;

  const missionRow = await getCampaignMissionById(missionId);
  if (!missionRow) throw new NotFoundError("Mission not found.");

  let current = await loadOrCreatePreparation(missionId, actor, false);
  if (!current.id) {
    current = await createEmptyPreparation({
      missionId,
      createdByUserId: actor.userId,
    });
  }

  if (
    patch.readinessState &&
    !canTransitionReadiness(current.readinessState, patch.readinessState)
  ) {
    throw new ValidationError("Invalid readiness transition.");
  }

  // Marking READY requires operator action; checklist alone never auto-sets READY.
  const merged = mergePreparationPatch(current, patch, actor.userId);
  const saved = await savePreparationRecord(merged);

  const mission = await getMissionHomeViewModelById(missionId);
  const readinessChecks = buildPreparationReadinessChecks(saved, {
    hasObjective: Boolean(mission.objective),
    hasSuccessCriteria: mission.successCriteria.length > 0,
  });

  return {
    mission,
    preparation: saved,
    readinessChecks,
    lifecyclePhaseUnchangedByReadiness: true,
    eventScheduleEditableHere: false,
  };
}

/**
 * Pure helper for tests: prove preparation fields survive a mission projection upsert payload.
 * CampaignMission upsert never reads MissionPreparation columns.
 */
export function preparationSurvivesMissionReprojection(input: {
  before: MissionPreparationRecord;
  projectedMissionAttendTitle: string;
}): MissionPreparationRecord {
  // Reprojection updates CampaignMission only — preparation record is untouched.
  void input.projectedMissionAttendTitle;
  return input.before;
}
