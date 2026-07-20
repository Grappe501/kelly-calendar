import "server-only";

import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { getPublicAppConfig } from "@/lib/env/public-config";
import {
  buildCloseoutChecklist,
  buildFollowUpSummary,
  canCloseMission,
  canMarkReadyToClose,
  canTransitionFollowUpAction,
  canTransitionFollowUpWorkspace,
  collectApprovedFollowUpCandidates,
  emptyMissionFollowUp,
  formatDueLabel,
  labelFollowUpActionStatus,
  labelFollowUpActionPriority,
  labelFollowUpSource,
  labelOwnerType,
  selectNextRequiredAction,
  validateFollowUpPatch,
  campaignDateKey,
  type MissionFollowUpActionRecord,
  type MissionFollowUpActionViewModel,
  type MissionFollowUpRecord,
  type MissionFollowUpViewModel,
} from "@/lib/missions/v21/follow-up";
import { emptyMissionDebrief } from "@/lib/missions/v21/debrief";
import {
  ConflictError,
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  debriefFromRow,
  getDebriefByMissionId,
} from "@/server/repositories/mission-debrief-repository";
import {
  createEmptyFollowUp,
  createFollowUpAction,
  followUpFromRow,
  getFollowUpByMissionId,
  saveFollowUpAction,
  saveFollowUpWorkspace,
} from "@/server/repositories/mission-follow-up-repository";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import { getMissionHomeViewModelById } from "@/server/services/todays-mission-service";

export type { MissionFollowUpViewModel };

function requireFollowUpAccess(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Follow-up Mode requires campaign leadership access.",
    );
  }
}

async function loadDebrief(missionId: string) {
  const row = await getDebriefByMissionId(missionId);
  if (!row) return { ...emptyMissionDebrief(missionId), id: "" };
  return debriefFromRow(row);
}

async function loadOrCreateFollowUp(
  missionId: string,
  actor: AuthenticatedActor,
  createIfMissing: boolean,
): Promise<MissionFollowUpRecord> {
  const mission = await getCampaignMissionById(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");

  const existing = await getFollowUpByMissionId(missionId);
  if (existing) return followUpFromRow(existing);

  if (!createIfMissing) return emptyMissionFollowUp(missionId);

  return createEmptyFollowUp({
    missionId,
    createdByUserId: actor.userId,
  });
}

function toActionView(
  action: MissionFollowUpActionRecord,
  now: Date,
  tz: string,
): MissionFollowUpActionViewModel {
  const dueDay = action.dueAt
    ? campaignDateKey(new Date(action.dueAt), tz)
    : null;
  const today = campaignDateKey(now, tz);
  return {
    ...action,
    sourceLabel: labelFollowUpSource(action.sourceType),
    statusLabel: labelFollowUpActionStatus(action.status),
    priorityLabel: labelFollowUpActionPriority(action.priority),
    ownerLabel:
      action.ownerType === "UNASSIGNED"
        ? "Owner needed"
        : action.ownerName ||
          action.ownerRole ||
          labelOwnerType(action.ownerType),
    dueLabel: formatDueLabel(action.dueAt, now, tz),
    isOverdue: Boolean(
      dueDay &&
        dueDay < today &&
        action.status !== "COMPLETED" &&
        action.status !== "CANCELLED",
    ),
    isDueToday: Boolean(dueDay && dueDay === today),
  };
}

function groupActions(
  actions: MissionFollowUpActionViewModel[],
): Pick<
  MissionFollowUpViewModel,
  | "commitments"
  | "relationshipActions"
  | "unresolvedQuestions"
  | "otherActions"
  | "blockedActions"
  | "waitingActions"
  | "completedActions"
  | "cancelledActions"
> {
  return {
    commitments: actions.filter((a) => a.sourceType === "EXECUTE_COMMITMENT"),
    relationshipActions: actions.filter(
      (a) =>
        a.sourceType === "PERSON_RELATIONSHIP_NEXT_STEP" ||
        a.sourceType === "ORGANIZATION_RELATIONSHIP_NEXT_STEP",
    ),
    unresolvedQuestions: actions.filter(
      (a) => a.sourceType === "UNRESOLVED_QUESTION",
    ),
    otherActions: actions.filter(
      (a) =>
        a.sourceType !== "EXECUTE_COMMITMENT" &&
        a.sourceType !== "PERSON_RELATIONSHIP_NEXT_STEP" &&
        a.sourceType !== "ORGANIZATION_RELATIONSHIP_NEXT_STEP" &&
        a.sourceType !== "UNRESOLVED_QUESTION" &&
        a.status !== "COMPLETED" &&
        a.status !== "CANCELLED" &&
        a.status !== "BLOCKED" &&
        a.status !== "WAITING",
    ),
    blockedActions: actions.filter((a) => a.status === "BLOCKED"),
    waitingActions: actions.filter((a) => a.status === "WAITING"),
    completedActions: actions.filter((a) => a.status === "COMPLETED"),
    cancelledActions: actions.filter((a) => a.status === "CANCELLED"),
  };
}

function toViewModel(
  mission: Awaited<ReturnType<typeof getMissionHomeViewModelById>>,
  debrief: Awaited<ReturnType<typeof loadDebrief>>,
  followUp: MissionFollowUpRecord,
  importResult: MissionFollowUpViewModel["lastImportResult"],
): MissionFollowUpViewModel {
  const tz = getPublicAppConfig().campaignTimezone;
  const now = new Date();
  const actionViews = followUp.actions.map((a) => toActionView(a, now, tz));
  const next = selectNextRequiredAction(followUp.actions, {
    now,
    campaignTimezone: tz,
  });
  const debriefApproved = debrief.debriefStatus === "APPROVED";
  const candidates = debrief.id
    ? collectApprovedFollowUpCandidates(mission.missionId, debrief)
    : [];
  const existingKeys = new Set(
    followUp.actions.map((a) => a.importKey).filter(Boolean),
  );
  const importEligibleCount = candidates.filter(
    (c) => !existingKeys.has(c.importKey),
  ).length;

  return {
    mission,
    debrief: {
      status: debrief.id ? debrief.debriefStatus : null,
      outcomeAssessment: debrief.id ? debrief.outcomeAssessment : null,
      outcomeSummary: debrief.outcomeSummary,
      approvedAt: debrief.approvedAt,
      approvedBy: debrief.approvedByUserId,
      exists: Boolean(debrief.id),
    },
    followUp,
    summary: buildFollowUpSummary(followUp.actions, now, tz),
    nextRequiredAction: next ? toActionView(next, now, tz) : null,
    ...groupActions(actionViews),
    closeoutChecklist: buildCloseoutChecklist(followUp, {
      debriefApproved,
      now,
      campaignTimezone: tz,
    }),
    importEligibleCount,
    lastImportResult: importResult,
    isolation: {
      lifecyclePhaseUnchangedByFollowUp: true,
      operationalStatusUnchangedByFollowUp: true,
      preparationReadOnly: true,
      executionReadOnly: true,
      debriefReadOnly: true,
      eventScheduleEditableHere: false,
    },
  };
}

export async function getFollowUpWorkspace(
  missionId: string,
  actor: AuthenticatedActor,
): Promise<MissionFollowUpViewModel> {
  requireFollowUpAccess(actor);
  const mission = await getMissionHomeViewModelById(missionId);
  const debrief = await loadDebrief(missionId);
  const followUp = await loadOrCreateFollowUp(missionId, actor, false);
  return toViewModel(mission, debrief, followUp, null);
}

export async function patchMissionFollowUp(
  missionId: string,
  actor: AuthenticatedActor,
  rawBody: unknown,
): Promise<MissionFollowUpViewModel> {
  requireFollowUpAccess(actor);

  const validated = validateFollowUpPatch(rawBody);
  if (!validated.ok || !validated.value) {
    throw new ValidationError(
      validated.issues[0]?.message ?? "Invalid follow-up payload.",
    );
  }

  const missionRow = await getCampaignMissionById(missionId);
  if (!missionRow) throw new NotFoundError("Mission not found.");

  let current = await loadOrCreateFollowUp(missionId, actor, false);
  if (!current.id) {
    current = await createEmptyFollowUp({
      missionId,
      createdByUserId: actor.userId,
    });
  }

  const debrief = await loadDebrief(missionId);
  const patch = validated.value;
  const nowIso = new Date().toISOString();
  let importResult: MissionFollowUpViewModel["lastImportResult"] = null;
  const tz = getPublicAppConfig().campaignTimezone;

  if (patch.section === "start") {
    if (!canTransitionFollowUpWorkspace(current.followUpStatus, "ACTIVE")) {
      throw new ValidationError(
        `Cannot start Follow-up from ${current.followUpStatus}.`,
      );
    }
    current = {
      ...current,
      followUpStatus: "ACTIVE",
      startedAt: current.startedAt ?? nowIso,
      startedByUserId: current.startedByUserId ?? actor.userId,
      updatedByUserId: actor.userId,
      updatedAt: nowIso,
    };
    current = await saveFollowUpWorkspace(current);
  } else if (patch.section === "import") {
    if (debrief.debriefStatus !== "APPROVED") {
      throw new ValidationError(
        "Official Follow-up import requires an approved Debrief.",
      );
    }
    const candidates = collectApprovedFollowUpCandidates(missionId, debrief);
    let imported = 0;
    let alreadyPresent = 0;
    const failed = 0;
    for (const c of candidates) {
      if (current.actions.some((a) => a.importKey === c.importKey)) {
        alreadyPresent++;
        continue;
      }
      const created = await createFollowUpAction({
        followUpId: current.id,
        sourceType: c.sourceType,
        sourceRecordId: c.sourceRecordId,
        importKey: c.importKey,
        sourceSnapshot: c.sourceSnapshot,
        title: c.title,
        description: c.description,
        status: "OPEN",
        priority: c.priority,
        ownerType: c.ownerName ? "EXTERNAL" : "UNASSIGNED",
        ownerUserId: null,
        ownerName: c.ownerName,
        ownerRole: null,
        relatedPersonName: c.relatedPersonName,
        relatedOrganizationName: c.relatedOrganizationName,
        dueAt: c.dueAt,
        nextCheckAt: null,
        waitingReason: null,
        blockedReason: null,
        completionSummary: null,
        completionEvidence: [],
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdByUserId: actor.userId,
        updatedByUserId: actor.userId,
        completedByUserId: null,
        cancelledByUserId: null,
        sortOrder: current.actions.length + imported,
      });
      current.actions = [...current.actions, created];
      imported++;
    }
    if (
      current.followUpStatus === "NOT_STARTED" &&
      (imported > 0 || alreadyPresent > 0)
    ) {
      current = {
        ...current,
        followUpStatus: "ACTIVE",
        startedAt: current.startedAt ?? nowIso,
        startedByUserId: current.startedByUserId ?? actor.userId,
        updatedByUserId: actor.userId,
      };
      current = await saveFollowUpWorkspace(current);
    }
    // Reload actions after import
    const reloaded = await getFollowUpByMissionId(missionId);
    if (reloaded) current = followUpFromRow(reloaded);
    importResult = { imported, alreadyPresent, failed };
  } else if (patch.section === "notes" || patch.section === "all") {
    if (patch.closeoutSummary !== undefined) {
      current.closeoutSummary = patch.closeoutSummary;
    }
    if (patch.unresolvedSummary !== undefined) {
      current.unresolvedSummary = patch.unresolvedSummary;
    }
    if (patch.internalNotes !== undefined) {
      current.internalNotes = patch.internalNotes;
    }
    current.updatedByUserId = actor.userId;
    current = await saveFollowUpWorkspace(current);
  } else if (patch.section === "addAction") {
    const title = patch.action?.title?.trim();
    if (!title) throw new ValidationError("Action title is required.");
    const created = await createFollowUpAction({
      followUpId: current.id,
      sourceType: "OPERATOR_ADDED",
      sourceRecordId: null,
      importKey: null,
      sourceSnapshot: {
        reason: patch.action?.description ?? "Operator-added Mission closeout work",
      },
      title,
      description: patch.action?.description ?? null,
      status: "OPEN",
      priority: patch.action?.priority ?? "NORMAL",
      ownerType: patch.action?.ownerType ?? "UNASSIGNED",
      ownerUserId: patch.action?.ownerUserId ?? null,
      ownerName: patch.action?.ownerName ?? null,
      ownerRole: patch.action?.ownerRole ?? null,
      relatedPersonName: patch.action?.relatedPersonName ?? null,
      relatedOrganizationName: patch.action?.relatedOrganizationName ?? null,
      dueAt: patch.action?.dueAt ?? null,
      nextCheckAt: null,
      waitingReason: null,
      blockedReason: null,
      completionSummary: null,
      completionEvidence: [],
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdByUserId: actor.userId,
      updatedByUserId: actor.userId,
      completedByUserId: null,
      cancelledByUserId: null,
      sortOrder: current.actions.length,
    });
    if (current.followUpStatus === "NOT_STARTED") {
      current = {
        ...current,
        followUpStatus: "ACTIVE",
        startedAt: nowIso,
        startedByUserId: actor.userId,
        updatedByUserId: actor.userId,
      };
      current = await saveFollowUpWorkspace(current);
    }
    current.actions = [...current.actions, created];
  } else if (patch.section === "updateAction") {
    const actionId = patch.action?.id;
    const existing = current.actions.find((a) => a.id === actionId);
    if (!existing) throw new NotFoundError("Follow-up action not found.");
    const nextStatus = patch.action?.status ?? existing.status;
    if (
      nextStatus !== existing.status &&
      !canTransitionFollowUpAction(existing.status, nextStatus)
    ) {
      throw new ValidationError(
        `Cannot transition action from ${existing.status} to ${nextStatus}.`,
      );
    }
    if (nextStatus === "WAITING" && !patch.action?.waitingReason && !existing.waitingReason) {
      throw new ValidationError("Waiting reason is required.");
    }
    if (nextStatus === "BLOCKED" && !patch.action?.blockedReason && !existing.blockedReason) {
      throw new ValidationError("Blocked reason is required.");
    }
    const updated: MissionFollowUpActionRecord = {
      ...existing,
      title: patch.action?.title ?? existing.title,
      description:
        patch.action?.description !== undefined
          ? patch.action.description
          : existing.description,
      status: nextStatus,
      priority: patch.action?.priority ?? existing.priority,
      ownerType: patch.action?.ownerType ?? existing.ownerType,
      ownerName:
        patch.action?.ownerName !== undefined
          ? patch.action.ownerName
          : existing.ownerName,
      ownerRole:
        patch.action?.ownerRole !== undefined
          ? patch.action.ownerRole
          : existing.ownerRole,
      ownerUserId:
        patch.action?.ownerUserId !== undefined
          ? patch.action.ownerUserId
          : existing.ownerUserId,
      relatedPersonName:
        patch.action?.relatedPersonName !== undefined
          ? patch.action.relatedPersonName
          : existing.relatedPersonName,
      relatedOrganizationName:
        patch.action?.relatedOrganizationName !== undefined
          ? patch.action.relatedOrganizationName
          : existing.relatedOrganizationName,
      dueAt:
        patch.action?.dueAt !== undefined ? patch.action.dueAt : existing.dueAt,
      nextCheckAt:
        patch.action?.nextCheckAt !== undefined
          ? patch.action.nextCheckAt
          : existing.nextCheckAt,
      waitingReason:
        patch.action?.waitingReason !== undefined
          ? patch.action.waitingReason
          : existing.waitingReason,
      blockedReason:
        patch.action?.blockedReason !== undefined
          ? patch.action.blockedReason
          : existing.blockedReason,
      updatedByUserId: actor.userId,
      updatedAt: nowIso,
    };
    try {
      const saved = await saveFollowUpAction(
        updated,
        patch.action?.expectedUpdatedAt,
      );
      current.actions = current.actions.map((a) =>
        a.id === saved.id ? saved : a,
      );
    } catch (e) {
      if (e instanceof Error && (e as Error & { code?: string }).code === "CONFLICT") {
        throw new ConflictError(
          "Another operator updated this action. Review and retry.",
        );
      }
      throw e;
    }
  } else if (patch.section === "completeAction") {
    const existing = current.actions.find((a) => a.id === patch.action?.id);
    if (!existing) throw new NotFoundError("Follow-up action not found.");
    if (!canTransitionFollowUpAction(existing.status, "COMPLETED")) {
      throw new ValidationError(
        `Cannot complete action from ${existing.status}.`,
      );
    }
    const summary =
      patch.action?.completionSummary?.trim() ||
      patch.evidenceNote?.trim() ||
      null;
    if (!summary) {
      throw new ValidationError("Completion summary is required.");
    }
    const evidence = [...existing.completionEvidence];
    if (patch.evidenceNote?.trim()) {
      evidence.push({
        id: `ev_${Date.now().toString(36)}`,
        type: patch.evidenceType ?? "NOTE",
        note: patch.evidenceNote.trim(),
        reference: null,
        createdAt: nowIso,
        createdByUserId: actor.userId,
      });
    }
    const saved = await saveFollowUpAction(
      {
        ...existing,
        status: "COMPLETED",
        completionSummary: summary,
        completionEvidence: evidence,
        completedAt: nowIso,
        completedByUserId: actor.userId,
        updatedByUserId: actor.userId,
      },
      patch.action?.expectedUpdatedAt,
    );
    current.actions = current.actions.map((a) =>
      a.id === saved.id ? saved : a,
    );
  } else if (patch.section === "cancelAction") {
    const existing = current.actions.find((a) => a.id === patch.action?.id);
    if (!existing) throw new NotFoundError("Follow-up action not found.");
    if (!canTransitionFollowUpAction(existing.status, "CANCELLED")) {
      throw new ValidationError(
        `Cannot cancel action from ${existing.status}.`,
      );
    }
    const reason = patch.cancellationReason?.trim();
    if (!reason) {
      throw new ValidationError("Cancellation reason is required.");
    }
    const saved = await saveFollowUpAction(
      {
        ...existing,
        status: "CANCELLED",
        cancellationReason: reason,
        cancelledAt: nowIso,
        cancelledByUserId: actor.userId,
        updatedByUserId: actor.userId,
      },
      patch.action?.expectedUpdatedAt,
    );
    current.actions = current.actions.map((a) =>
      a.id === saved.id ? saved : a,
    );
  } else if (patch.section === "readyToClose") {
    if (patch.closeoutSummary !== undefined) {
      current.closeoutSummary = patch.closeoutSummary;
    }
    if (patch.unresolvedSummary !== undefined) {
      current.unresolvedSummary = patch.unresolvedSummary;
    }
    const ready = canMarkReadyToClose(current, {
      debriefApproved: debrief.debriefStatus === "APPROVED",
      now: new Date(),
      campaignTimezone: tz,
    });
    if (!ready.ok) throw new ValidationError(ready.message);
    if (!canTransitionFollowUpWorkspace(current.followUpStatus, "READY_TO_CLOSE")) {
      throw new ValidationError(
        `Cannot mark ready to close from ${current.followUpStatus}.`,
      );
    }
    current = {
      ...current,
      followUpStatus: "READY_TO_CLOSE",
      completedAt: nowIso,
      updatedByUserId: actor.userId,
    };
    current = await saveFollowUpWorkspace(current);
  } else if (patch.section === "close") {
    if (patch.closeoutSummary !== undefined) {
      current.closeoutSummary = patch.closeoutSummary;
    }
    const closable = canCloseMission(
      current,
      debrief.debriefStatus === "APPROVED",
    );
    if (!closable.ok) throw new ValidationError(closable.message);
    current = {
      ...current,
      followUpStatus: "CLOSED",
      closedAt: nowIso,
      closedByUserId: actor.userId,
      updatedByUserId: actor.userId,
    };
    current = await saveFollowUpWorkspace(current);
  }

  const mission = await getMissionHomeViewModelById(missionId);
  const reloaded = await getFollowUpByMissionId(missionId);
  const followUp = reloaded ? followUpFromRow(reloaded) : current;
  return toViewModel(mission, debrief, followUp, importResult);
}
