import { canTransitionExecution } from "@/lib/missions/v21/execution/transitions";
import type {
  ExecutionPatchInput,
  MissionExecutionRecord,
  MissionExecutionStatus,
} from "@/lib/missions/v21/execution/types";

export type ExecutionMergeResult =
  | { ok: true; record: MissionExecutionRecord }
  | { ok: false; code: string; message: string };

/**
 * Merge a validated Execute patch. Transition sections enforce status rules.
 * Untouched arrays/fields are preserved.
 */
export function mergeExecutionPatch(
  current: MissionExecutionRecord,
  patch: ExecutionPatchInput,
  actorUserId: string | null,
  now = new Date(),
): ExecutionMergeResult {
  const next: MissionExecutionRecord = {
    ...current,
    updatedAt: now.toISOString(),
    updatedByUserId: actorUserId,
  };
  const nowIso = now.toISOString();
  const section = patch.section;

  if (section === "arrive") {
    if (!canTransitionExecution(current.executionStatus, "ARRIVED")) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Cannot mark arrived from ${current.executionStatus}.`,
      };
    }
    next.executionStatus = "ARRIVED";
    next.arrivedAt = current.arrivedAt ?? nowIso;
    next.arrivedByUserId = actorUserId;
    if (patch.note !== undefined) next.arrivalNote = patch.note;
    if (patch.arrivalNote !== undefined) next.arrivalNote = patch.arrivalNote;
    return { ok: true, record: next };
  }

  if (section === "start") {
    if (!canTransitionExecution(current.executionStatus, "IN_PROGRESS")) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Cannot begin mission from ${current.executionStatus}.`,
      };
    }
    next.executionStatus = "IN_PROGRESS";
    next.startedAt = current.startedAt ?? nowIso;
    next.startedByUserId = actorUserId;
    if (!next.arrivedAt) {
      next.arrivedAt = nowIso;
      next.arrivedByUserId = actorUserId;
    }
    return { ok: true, record: next };
  }

  if (section === "complete") {
    if (!canTransitionExecution(current.executionStatus, "COMPLETED")) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Cannot end mission from ${current.executionStatus}.`,
      };
    }
    next.executionStatus = "COMPLETED";
    next.endedAt = nowIso;
    next.completedByUserId = actorUserId;
    return { ok: true, record: next };
  }

  if (section === "arrivalNote" || section === "all") {
    if (patch.arrivalNote !== undefined) next.arrivalNote = patch.arrivalNote;
  }
  if (section === "observations" || section === "all") {
    if (patch.liveObservations !== undefined) {
      next.liveObservations = patch.liveObservations;
    }
  }
  if (section === "peopleContacts" || section === "all") {
    if (patch.peopleContacts !== undefined) {
      next.peopleContacts = patch.peopleContacts;
    }
  }
  if (section === "organizationContacts" || section === "all") {
    if (patch.organizationContacts !== undefined) {
      next.organizationContacts = patch.organizationContacts;
    }
  }
  if (section === "commitments" || section === "all") {
    if (patch.commitments !== undefined) next.commitments = patch.commitments;
  }
  if (section === "immediateFollowUps" || section === "all") {
    if (patch.immediateFollowUps !== undefined) {
      next.immediateFollowUps = patch.immediateFollowUps;
    }
  }
  if (section === "fieldNotes" || section === "all") {
    if (patch.fieldNotes !== undefined) next.fieldNotes = patch.fieldNotes;
  }

  // Status itself is only changed by arrive/start/complete — never via "all" payload.
  void (null as MissionExecutionStatus | null);

  return { ok: true, record: next };
}
