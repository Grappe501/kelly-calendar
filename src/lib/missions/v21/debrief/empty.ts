import type { MissionDebriefRecord } from "@/lib/missions/v21/debrief/types";

export function emptyMissionDebrief(missionId: string): MissionDebriefRecord {
  const now = new Date(0).toISOString();
  return {
    id: "",
    missionId,
    debriefStatus: "NOT_STARTED",
    outcomeAssessment: "NOT_ASSESSED",
    outcomeSummary: null,
    criterionAssessments: [],
    peopleOutcomes: [],
    organizationOutcomes: [],
    commitmentReviews: [],
    followUpReviews: [],
    whatWorked: [],
    whatDidNotWork: [],
    lessonsLearned: [],
    strategicInsights: [],
    unresolvedQuestions: [],
    recommendedNextSteps: [],
    internalNotes: null,
    startedAt: null,
    completedAt: null,
    approvedAt: null,
    startedByUserId: null,
    completedByUserId: null,
    approvedByUserId: null,
    createdByUserId: null,
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
  };
}
