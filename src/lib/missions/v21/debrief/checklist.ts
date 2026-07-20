import type { MissionDebriefRecord } from "@/lib/missions/v21/debrief/types";

export type DebriefChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
};

/**
 * Completion readiness derived from record content.
 * Does not mutate persisted debriefStatus.
 */
export function buildDebriefChecklist(
  record: MissionDebriefRecord,
  options?: {
    hasExecutionRecord: boolean;
    successCriteriaCount: number;
  },
): DebriefChecklistItem[] {
  const hasExecution = options?.hasExecutionRecord ?? false;
  const criteriaCount = options?.successCriteriaCount ?? 0;
  const criteriaReviewed =
    criteriaCount === 0 ||
    (record.criterionAssessments.length >= criteriaCount &&
      record.criterionAssessments.every((c) => c.assessment != null));

  const learningCaptured =
    record.whatWorked.length > 0 ||
    record.whatDidNotWork.length > 0 ||
    record.lessonsLearned.length > 0;

  const commitmentsReviewed =
    record.commitmentReviews.length === 0 ||
    record.commitmentReviews.every(
      (c) => c.confirmed || c.resolved || c.uncertain || c.approvedForFollowUp,
    );

  const followUpsReviewed =
    record.followUpReviews.length === 0 ||
    record.followUpReviews.every(
      (f) => f.resolved || f.approvedForFollowUp || f.clarification,
    );

  const nextActionsReviewed = true; // reviewed when operator reaches section; empty ok

  return [
    {
      id: "execution",
      label: "Execution record reviewed",
      ok: hasExecution,
    },
    {
      id: "outcome",
      label: "Outcome assessed",
      ok: record.outcomeAssessment !== "NOT_ASSESSED",
    },
    {
      id: "summary",
      label: "Outcome summary entered",
      ok: Boolean(record.outcomeSummary?.trim()),
    },
    {
      id: "criteria",
      label: "Success criteria reviewed",
      ok: criteriaReviewed,
    },
    {
      id: "people",
      label: "People outcomes reviewed",
      ok:
        record.peopleOutcomes.length === 0 ||
        record.peopleOutcomes.some(
          (p) => p.relationshipOutcome !== "NOT_CONTACTED" || p.notes,
        ) ||
        record.peopleOutcomes.length > 0,
    },
    {
      id: "organizations",
      label: "Organization outcomes reviewed",
      ok: true,
    },
    {
      id: "commitments",
      label: "Commitments reviewed",
      ok: commitmentsReviewed,
    },
    {
      id: "followUps",
      label: "Immediate follow-ups reviewed",
      ok: followUpsReviewed,
    },
    {
      id: "lessons",
      label: "Lessons captured",
      ok: learningCaptured,
    },
    {
      id: "nextActions",
      label: "Next actions reviewed",
      ok: nextActionsReviewed,
    },
    {
      id: "approval",
      label:
        record.debriefStatus === "APPROVED"
          ? "Approval complete"
          : "Approval pending",
      ok: record.debriefStatus === "APPROVED",
    },
  ];
}

export function canCompleteDebrief(
  record: MissionDebriefRecord,
  options?: {
    hasExecutionRecord: boolean;
    successCriteriaCount: number;
  },
): { ok: true } | { ok: false; message: string } {
  const checks = buildDebriefChecklist(record, options);
  const required = ["outcome", "summary", "criteria", "commitments", "followUps", "lessons"];
  const missing = required.filter((id) => !checks.find((c) => c.id === id)?.ok);
  if (missing.length) {
    return {
      ok: false,
      message: `Debrief is not ready to complete. Missing: ${missing.join(", ")}.`,
    };
  }
  return { ok: true };
}

export function canApproveDebrief(
  record: MissionDebriefRecord,
): { ok: true } | { ok: false; message: string } {
  if (record.debriefStatus !== "COMPLETED") {
    return {
      ok: false,
      message: "Debrief must be completed before approval.",
    };
  }
  if (record.outcomeAssessment === "NOT_ASSESSED") {
    return {
      ok: false,
      message: "Outcome must be assessed before approval.",
    };
  }
  if (!record.outcomeSummary?.trim()) {
    return {
      ok: false,
      message: "Outcome summary is required before approval.",
    };
  }
  return { ok: true };
}

export function isReadyForApproval(record: MissionDebriefRecord): boolean {
  return (
    record.debriefStatus === "COMPLETED" &&
    record.outcomeAssessment !== "NOT_ASSESSED" &&
    Boolean(record.outcomeSummary?.trim())
  );
}
