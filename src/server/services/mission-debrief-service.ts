import "server-only";

import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  buildDebriefChecklist,
  emptyMissionDebrief,
  isReadyForApproval,
  labelDebriefPresentationSummary,
  mergeDebriefPatch,
  seedDebriefReviews,
  validateDebriefPatch,
  type MissionDebriefRecord,
  type MissionDebriefViewModel,
} from "@/lib/missions/v21/debrief";
import { emptyMissionExecution } from "@/lib/missions/v21/execution";
import { emptyMissionPreparation } from "@/lib/missions/v21/preparation";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  createEmptyDebrief,
  debriefFromRow,
  getDebriefByMissionId,
  saveDebriefRecord,
} from "@/server/repositories/mission-debrief-repository";
import {
  executionFromRow,
  getExecutionByMissionId,
} from "@/server/repositories/mission-execution-repository";
import {
  getPreparationByMissionId,
  preparationFromRow,
} from "@/server/repositories/mission-preparation-repository";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import { getMissionHomeViewModelById } from "@/server/services/todays-mission-service";

export type { MissionDebriefViewModel };

function requireDebriefAccess(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Debrief Mode requires campaign leadership access.",
    );
  }
}

async function loadPreparationBrief(missionId: string) {
  const row = await getPreparationByMissionId(missionId);
  if (!row) {
    const empty = emptyMissionPreparation(missionId);
    return { ...empty, id: "" };
  }
  return preparationFromRow(row);
}

async function loadExecutionBrief(missionId: string) {
  const row = await getExecutionByMissionId(missionId);
  if (!row) {
    return { ...emptyMissionExecution(missionId), id: "" };
  }
  return executionFromRow(row);
}

async function loadOrCreateDebrief(
  missionId: string,
  actor: AuthenticatedActor,
  createIfMissing: boolean,
): Promise<MissionDebriefRecord> {
  const mission = await getCampaignMissionById(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");

  const existing = await getDebriefByMissionId(missionId);
  if (existing) return debriefFromRow(existing);

  if (!createIfMissing) {
    return emptyMissionDebrief(missionId);
  }

  return createEmptyDebrief({
    missionId,
    createdByUserId: actor.userId,
  });
}

function applySeeds(
  debrief: MissionDebriefRecord,
  mission: Awaited<ReturnType<typeof getMissionHomeViewModelById>>,
  preparation: Awaited<ReturnType<typeof loadPreparationBrief>>,
  execution: Awaited<ReturnType<typeof loadExecutionBrief>>,
): MissionDebriefRecord {
  return seedDebriefReviews(debrief, {
    successCriteria: mission.successCriteria,
    preparePeople: preparation.peopleBriefings,
    prepareOrgs: preparation.organizationBriefings,
    peopleContacts: execution.peopleContacts,
    organizationContacts: execution.organizationContacts,
    commitments: execution.commitments,
    immediateFollowUps: execution.immediateFollowUps,
  });
}

function toViewModel(
  mission: Awaited<ReturnType<typeof getMissionHomeViewModelById>>,
  preparation: Awaited<ReturnType<typeof loadPreparationBrief>>,
  execution: Awaited<ReturnType<typeof loadExecutionBrief>>,
  debrief: MissionDebriefRecord,
): MissionDebriefViewModel {
  const seeded = applySeeds(debrief, mission, preparation, execution);
  const hasExecution = Boolean(execution.id);
  const checklist = buildDebriefChecklist(seeded, {
    hasExecutionRecord: hasExecution,
    successCriteriaCount: mission.successCriteria.length,
  });
  const ready = isReadyForApproval(seeded);

  return {
    mission,
    preparation: {
      readiness: preparation.id ? preparation.readinessState : null,
      strategicPurpose: preparation.strategicPurpose,
      keyMessage: preparation.keyMessage,
      people: preparation.peopleBriefings,
      organizations: preparation.organizationBriefings,
      preparationTasks: preparation.preparationTasks,
      materialsNeeded: preparation.materialsNeeded,
      logisticsNotes: preparation.logisticsNotes,
    },
    execution: {
      status: execution.id ? execution.executionStatus : null,
      exists: hasExecution,
      arrivedAt: execution.arrivedAt,
      startedAt: execution.startedAt,
      endedAt: execution.endedAt,
      arrivalNote: execution.arrivalNote,
      observations: execution.liveObservations,
      peopleContacts: execution.peopleContacts,
      organizationContacts: execution.organizationContacts,
      commitments: execution.commitments,
      immediateFollowUps: execution.immediateFollowUps,
      fieldNotes: execution.fieldNotes,
    },
    debrief: seeded,
    checklist,
    presentationSummary: labelDebriefPresentationSummary(
      seeded.debriefStatus,
      ready,
    ),
    isolation: {
      lifecyclePhaseUnchangedByDebrief: true,
      operationalStatusUnchangedByDebrief: true,
      preparationReadOnly: true,
      executionReadOnly: true,
      eventScheduleEditableHere: false,
    },
  };
}

export async function getDebriefWorkspace(
  missionId: string,
  actor: AuthenticatedActor,
): Promise<MissionDebriefViewModel> {
  requireDebriefAccess(actor);
  const mission = await getMissionHomeViewModelById(missionId);
  const preparation = await loadPreparationBrief(missionId);
  const execution = await loadExecutionBrief(missionId);
  const debrief = await loadOrCreateDebrief(missionId, actor, false);
  return toViewModel(mission, preparation, execution, debrief);
}

export async function patchMissionDebrief(
  missionId: string,
  actor: AuthenticatedActor,
  rawBody: unknown,
): Promise<MissionDebriefViewModel> {
  requireDebriefAccess(actor);

  const validated = validateDebriefPatch(rawBody);
  if (!validated.ok || !validated.value) {
    throw new ValidationError(
      validated.issues[0]?.message ?? "Invalid debrief payload.",
    );
  }

  const missionRow = await getCampaignMissionById(missionId);
  if (!missionRow) throw new NotFoundError("Mission not found.");

  let current = await loadOrCreateDebrief(missionId, actor, false);
  if (!current.id) {
    current = await createEmptyDebrief({
      missionId,
      createdByUserId: actor.userId,
    });
  }

  const preparation = await loadPreparationBrief(missionId);
  const execution = await loadExecutionBrief(missionId);
  const mission = await getMissionHomeViewModelById(missionId);

  // Seed review rows once so section PATCH has stable ids before merge
  current = applySeeds(current, mission, preparation, execution);

  const merged = mergeDebriefPatch(current, validated.value, actor.userId, {
    hasExecutionRecord: Boolean(execution.id),
    successCriteriaCount: mission.successCriteria.length,
  });
  if (!merged.ok) {
    throw new ValidationError(merged.message);
  }

  const saved = await saveDebriefRecord(merged.record);
  return toViewModel(mission, preparation, execution, saved);
}
