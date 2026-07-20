import "server-only";

import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import {
  emptyMissionExecution,
  mergeExecutionPatch,
  validateExecutionPatch,
  type MissionExecuteViewModel,
  type MissionExecutionRecord,
  type MissionPersonContact,
  type MissionOrganizationContact,
} from "@/lib/missions/v21/execution";
import { emptyMissionPreparation } from "@/lib/missions/v21/preparation";
import {
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  createEmptyExecution,
  executionFromRow,
  getExecutionByMissionId,
  saveExecutionRecord,
} from "@/server/repositories/mission-execution-repository";
import {
  getPreparationByMissionId,
  preparationFromRow,
} from "@/server/repositories/mission-preparation-repository";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import { getMissionHomeViewModelById } from "@/server/services/todays-mission-service";

export type { MissionExecuteViewModel };

function requireExecuteAccess(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Execute Mode requires campaign leadership access.",
    );
  }
}

function seedContactsFromPreparation(
  execution: MissionExecutionRecord,
  people: ReturnType<typeof preparationFromRow>["peopleBriefings"],
  orgs: ReturnType<typeof preparationFromRow>["organizationBriefings"],
): MissionExecutionRecord {
  const now = new Date().toISOString();
  let peopleContacts = execution.peopleContacts;
  let organizationContacts = execution.organizationContacts;

  if (peopleContacts.length === 0 && people.length > 0) {
    peopleContacts = people.map(
      (p, i): MissionPersonContact => ({
        id: `pc_${p.id || i}`,
        preparePersonId: p.id,
        name: p.name,
        state: "NOT_SEEN",
        note: null,
        updatedAt: now,
      }),
    );
  }
  if (organizationContacts.length === 0 && orgs.length > 0) {
    organizationContacts = orgs.map(
      (o, i): MissionOrganizationContact => ({
        id: `oc_${o.id || i}`,
        prepareOrganizationId: o.id,
        name: o.name,
        state: "NOT_ENGAGED",
        note: null,
        updatedAt: now,
      }),
    );
  }

  return { ...execution, peopleContacts, organizationContacts };
}

async function loadPreparationBrief(missionId: string) {
  const row = await getPreparationByMissionId(missionId);
  if (!row) {
    const empty = emptyMissionPreparation(missionId);
    return { ...empty, id: "" };
  }
  return preparationFromRow(row);
}

async function loadOrCreateExecution(
  missionId: string,
  actor: AuthenticatedActor,
  createIfMissing: boolean,
): Promise<MissionExecutionRecord> {
  const mission = await getCampaignMissionById(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");

  const existing = await getExecutionByMissionId(missionId);
  if (existing) return executionFromRow(existing);

  if (!createIfMissing) {
    return emptyMissionExecution(missionId);
  }

  return createEmptyExecution({
    missionId,
    createdByUserId: actor.userId,
  });
}

function toViewModel(
  mission: Awaited<ReturnType<typeof getMissionHomeViewModelById>>,
  preparation: Awaited<ReturnType<typeof loadPreparationBrief>>,
  execution: MissionExecutionRecord,
): MissionExecuteViewModel {
  const seeded = seedContactsFromPreparation(
    execution,
    preparation.peopleBriefings,
    preparation.organizationBriefings,
  );
  return {
    mission,
    preparation: {
      readiness: preparation.id ? preparation.readinessState : null,
      strategicPurpose: preparation.strategicPurpose,
      keyMessage: preparation.keyMessage,
      successCriteria: mission.successCriteria,
      people: preparation.peopleBriefings,
      organizations: preparation.organizationBriefings,
    },
    execution: seeded,
    lifecyclePhaseUnchangedByExecution: true,
    operationalStatusUnchangedByExecution: true,
    preparationReadOnly: true,
    eventScheduleEditableHere: false,
  };
}

export async function getExecuteWorkspace(
  missionId: string,
  actor: AuthenticatedActor,
): Promise<MissionExecuteViewModel> {
  requireExecuteAccess(actor);
  const mission = await getMissionHomeViewModelById(missionId);
  const preparation = await loadPreparationBrief(missionId);
  const execution = await loadOrCreateExecution(missionId, actor, false);
  return toViewModel(mission, preparation, execution);
}

export async function patchMissionExecution(
  missionId: string,
  actor: AuthenticatedActor,
  rawBody: unknown,
): Promise<MissionExecuteViewModel> {
  requireExecuteAccess(actor);

  const validated = validateExecutionPatch(rawBody);
  if (!validated.ok || !validated.value) {
    throw new ValidationError(
      validated.issues[0]?.message ?? "Invalid execution payload.",
    );
  }

  const missionRow = await getCampaignMissionById(missionId);
  if (!missionRow) throw new NotFoundError("Mission not found.");

  let current = await loadOrCreateExecution(missionId, actor, false);
  if (!current.id) {
    current = await createEmptyExecution({
      missionId,
      createdByUserId: actor.userId,
    });
  }

  const preparation = await loadPreparationBrief(missionId);
  // Seed contact rows once so PATCH of contact states has stable ids
  current = seedContactsFromPreparation(
    current,
    preparation.peopleBriefings,
    preparation.organizationBriefings,
  );

  const merged = mergeExecutionPatch(current, validated.value, actor.userId);
  if (!merged.ok) {
    throw new ValidationError(merged.message);
  }

  const saved = await saveExecutionRecord(merged.record);
  const mission = await getMissionHomeViewModelById(missionId);
  return toViewModel(mission, preparation, saved);
}
