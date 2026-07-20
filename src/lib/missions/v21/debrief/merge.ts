import {
  canApproveDebrief,
  canCompleteDebrief,
} from "@/lib/missions/v21/debrief/checklist";
import { canTransitionDebrief } from "@/lib/missions/v21/debrief/transitions";
import type {
  DebriefPatchInput,
  MissionDebriefRecord,
} from "@/lib/missions/v21/debrief/types";

export type DebriefMergeResult =
  | { ok: true; record: MissionDebriefRecord }
  | { ok: false; code: string; message: string };

export type DebriefMergeContext = {
  hasExecutionRecord: boolean;
  successCriteriaCount: number;
};

/**
 * Merge a validated Debrief patch. Transition sections enforce status rules.
 * Untouched arrays/fields are preserved. Does not mutate Prepare/Execute.
 */
export function mergeDebriefPatch(
  current: MissionDebriefRecord,
  patch: DebriefPatchInput,
  actorUserId: string | null,
  context: DebriefMergeContext,
  now = new Date(),
): DebriefMergeResult {
  if (current.debriefStatus === "APPROVED" && patch.section !== "approve") {
    // Approved debriefs remain editable with audit (updatedAt/actor) — documented limitation.
    // Status stays APPROVED unless explicit reopen (not from APPROVED).
  }

  const next: MissionDebriefRecord = {
    ...current,
    updatedAt: now.toISOString(),
    updatedByUserId: actorUserId,
  };
  const nowIso = now.toISOString();
  const section = patch.section;

  if (section === "start") {
    if (!canTransitionDebrief(current.debriefStatus, "IN_PROGRESS")) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Cannot start debrief from ${current.debriefStatus}.`,
      };
    }
    next.debriefStatus = "IN_PROGRESS";
    next.startedAt = current.startedAt ?? nowIso;
    next.startedByUserId = current.startedByUserId ?? actorUserId;
    return { ok: true, record: next };
  }

  if (section === "reopen") {
    if (!canTransitionDebrief(current.debriefStatus, "IN_PROGRESS")) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Cannot reopen debrief from ${current.debriefStatus}.`,
      };
    }
    next.debriefStatus = "IN_PROGRESS";
    next.completedAt = null;
    next.completedByUserId = null;
    return { ok: true, record: next };
  }

  if (section === "complete") {
    // Apply any pending content fields first when bundled
    applyContentFields(next, patch);
    const ready = canCompleteDebrief(next, context);
    if (!ready.ok) {
      return { ok: false, code: "INCOMPLETE", message: ready.message };
    }
    if (!canTransitionDebrief(current.debriefStatus, "COMPLETED")) {
      // Allow completing from IN_PROGRESS; if already COMPLETED, refresh completedAt
      if (current.debriefStatus !== "COMPLETED") {
        return {
          ok: false,
          code: "INVALID_TRANSITION",
          message: `Cannot complete debrief from ${current.debriefStatus}.`,
        };
      }
    }
    next.debriefStatus = "COMPLETED";
    next.completedAt = nowIso;
    next.completedByUserId = actorUserId;
    if (!next.startedAt) {
      next.startedAt = nowIso;
      next.startedByUserId = actorUserId;
    }
    return { ok: true, record: next };
  }

  if (section === "approve") {
    const ready = canApproveDebrief(current);
    if (!ready.ok) {
      return { ok: false, code: "NOT_APPROVABLE", message: ready.message };
    }
    if (!canTransitionDebrief(current.debriefStatus, "APPROVED")) {
      return {
        ok: false,
        code: "INVALID_TRANSITION",
        message: `Cannot approve debrief from ${current.debriefStatus}.`,
      };
    }
    next.debriefStatus = "APPROVED";
    next.approvedAt = nowIso;
    next.approvedByUserId = actorUserId;
    return { ok: true, record: next };
  }

  // Content sections auto-start if still NOT_STARTED
  if (current.debriefStatus === "NOT_STARTED") {
    next.debriefStatus = "IN_PROGRESS";
    next.startedAt = nowIso;
    next.startedByUserId = actorUserId;
  }

  applyContentFields(next, patch);
  return { ok: true, record: next };
}

function applyContentFields(
  next: MissionDebriefRecord,
  patch: DebriefPatchInput,
): void {
  const section = patch.section;
  if (section === "outcome" || section === "all" || section === "complete") {
    if (patch.outcomeAssessment !== undefined) {
      next.outcomeAssessment = patch.outcomeAssessment;
    }
    if (patch.outcomeSummary !== undefined) {
      next.outcomeSummary = patch.outcomeSummary;
    }
  }
  if (section === "criteria" || section === "all" || section === "complete") {
    if (patch.criterionAssessments !== undefined) {
      next.criterionAssessments = patch.criterionAssessments;
    }
  }
  if (section === "peopleOutcomes" || section === "all") {
    if (patch.peopleOutcomes !== undefined) {
      next.peopleOutcomes = patch.peopleOutcomes;
    }
  }
  if (section === "organizationOutcomes" || section === "all") {
    if (patch.organizationOutcomes !== undefined) {
      next.organizationOutcomes = patch.organizationOutcomes;
    }
  }
  if (section === "commitmentReviews" || section === "all") {
    if (patch.commitmentReviews !== undefined) {
      next.commitmentReviews = patch.commitmentReviews;
    }
  }
  if (section === "followUpReviews" || section === "all") {
    if (patch.followUpReviews !== undefined) {
      next.followUpReviews = patch.followUpReviews;
    }
  }
  if (section === "whatWorked" || section === "all") {
    if (patch.whatWorked !== undefined) next.whatWorked = patch.whatWorked;
  }
  if (section === "whatDidNotWork" || section === "all") {
    if (patch.whatDidNotWork !== undefined) {
      next.whatDidNotWork = patch.whatDidNotWork;
    }
  }
  if (section === "lessons" || section === "all") {
    if (patch.lessonsLearned !== undefined) {
      next.lessonsLearned = patch.lessonsLearned;
    }
  }
  if (section === "insights" || section === "all") {
    if (patch.strategicInsights !== undefined) {
      next.strategicInsights = patch.strategicInsights;
    }
  }
  if (section === "questions" || section === "all") {
    if (patch.unresolvedQuestions !== undefined) {
      next.unresolvedQuestions = patch.unresolvedQuestions;
    }
  }
  if (section === "nextActions" || section === "all") {
    if (patch.recommendedNextSteps !== undefined) {
      next.recommendedNextSteps = patch.recommendedNextSteps;
    }
  }
  if (section === "notes" || section === "all") {
    if (patch.internalNotes !== undefined) {
      next.internalNotes = patch.internalNotes;
    }
  }
}
