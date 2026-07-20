/**
 * V2.1 Debrief Mode — after-action review types.
 * Distinct from lifecycle phase, operational status, prep readiness, and execution status.
 */

export const DEBRIEF_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "APPROVED",
] as const;

export type MissionDebriefStatus = (typeof DEBRIEF_STATUSES)[number];

export const OUTCOME_ASSESSMENTS = [
  "NOT_ASSESSED",
  "ACHIEVED",
  "PARTIALLY_ACHIEVED",
  "NOT_ACHIEVED",
  "INCONCLUSIVE",
] as const;

export type MissionOutcomeAssessment = (typeof OUTCOME_ASSESSMENTS)[number];

export const CRITERION_ASSESSMENTS = [
  "MET",
  "PARTIALLY_MET",
  "NOT_MET",
  "UNKNOWN",
] as const;

export type CriterionAssessmentValue = (typeof CRITERION_ASSESSMENTS)[number];

export const RELATIONSHIP_OUTCOMES = [
  "STRENGTHENED",
  "UNCHANGED",
  "UNCLEAR",
  "NEEDS_REPAIR",
  "NEW_RELATIONSHIP",
  "NOT_CONTACTED",
] as const;

export type RelationshipOutcomeValue = (typeof RELATIONSHIP_OUTCOMES)[number];

export const ORGANIZATION_RESULTS = [
  "ENGAGED",
  "PARTIAL_ENGAGEMENT",
  "NOT_ENGAGED",
  "FOLLOW_UP_NEEDED",
  "OUTCOME_UNCLEAR",
] as const;

export type OrganizationResultValue = (typeof ORGANIZATION_RESULTS)[number];

export const LESSON_CATEGORIES = [
  "MESSAGE",
  "RELATIONSHIP",
  "LOGISTICS",
  "EVENT_FORMAT",
  "FIELD_OPERATIONS",
  "MEDIA",
  "TRAVEL",
  "PREPARATION",
  "FOLLOW_UP",
  "OTHER",
] as const;

export type LessonCategory = (typeof LESSON_CATEGORIES)[number];

export const LESSON_IMPORTANCE = ["NORMAL", "IMPORTANT", "CRITICAL"] as const;
export type LessonImportance = (typeof LESSON_IMPORTANCE)[number];

export const QUESTION_STATUSES = [
  "OPEN",
  "RESEARCHING",
  "ANSWERED",
  "CLOSED_WITHOUT_ACTION",
] as const;

export type UnresolvedQuestionStatus = (typeof QUESTION_STATUSES)[number];

export const ACTION_PRIORITIES = ["NORMAL", "IMPORTANT", "URGENT"] as const;
export type DebriefActionPriority = (typeof ACTION_PRIORITIES)[number];

export const ACTION_SOURCES = [
  "EXECUTE_COMMITMENT",
  "EXECUTE_FOLLOW_UP",
  "SUCCESS_CRITERION",
  "RELATIONSHIP_OUTCOME",
  "LESSON_LEARNED",
  "UNRESOLVED_QUESTION",
  "OPERATOR_ADDED",
] as const;

export type DebriefActionSource = (typeof ACTION_SOURCES)[number];

export type MissionCriterionAssessment = {
  id: string;
  /** Original projected criterion text — never rewritten here */
  criterionText: string;
  assessment: CriterionAssessmentValue;
  evidence: string | null;
  notes: string | null;
  updatedAt: string;
};

export type MissionPersonOutcome = {
  id: string;
  name: string;
  roleOrOrg: string | null;
  prepareGoal: string | null;
  executeState: string | null;
  executeNote: string | null;
  relationshipOutcome: RelationshipOutcomeValue;
  recommendedNextStep: string | null;
  followUpNeeded: boolean;
  notes: string | null;
  updatedAt: string;
};

export type MissionOrganizationOutcome = {
  id: string;
  name: string;
  orgType: string | null;
  prepareDesiredOutcome: string | null;
  executeState: string | null;
  executeNote: string | null;
  result: OrganizationResultValue;
  relationshipChange: string | null;
  recommendedNextStep: string | null;
  followUpNeeded: boolean;
  notes: string | null;
  updatedAt: string;
};

export type MissionCommitmentReview = {
  id: string;
  /** Original Execute commitment id — source of truth for field capture */
  executeCommitmentId: string;
  originalText: string;
  clarification: string | null;
  owner: string | null;
  dueAt: string | null;
  confirmed: boolean;
  resolved: boolean;
  uncertain: boolean;
  approvedForFollowUp: boolean;
  notes: string | null;
  updatedAt: string;
};

export type MissionFollowUpReview = {
  id: string;
  executeFollowUpId: string;
  originalText: string;
  clarification: string | null;
  owner: string | null;
  priority: string | null;
  dueAt: string | null;
  resolved: boolean;
  approvedForFollowUp: boolean;
  notes: string | null;
  updatedAt: string;
};

export type MissionLessonItem = {
  id: string;
  statement: string;
  category: LessonCategory | null;
  explanation: string | null;
  /** whatWorked: become repeatable practice; whatDidNotWork: recommended change */
  practiceOrChange: string | null;
  rootCause: string | null;
  importance: LessonImportance;
  createdAt: string;
  createdByUserId: string | null;
};

export type MissionLesson = {
  id: string;
  statement: string;
  evidence: string | null;
  recommendedChange: string | null;
  applicability: string | null;
  category: LessonCategory | null;
  importance: LessonImportance;
  recommendForCampaignKnowledge: boolean;
  createdAt: string;
  createdByUserId: string | null;
};

export type MissionStrategicInsight = {
  id: string;
  text: string;
  createdAt: string;
  createdByUserId: string | null;
};

export type MissionUnresolvedQuestion = {
  id: string;
  question: string;
  whyItMatters: string | null;
  owner: string | null;
  dueAt: string | null;
  relatedTo: string | null;
  status: UnresolvedQuestionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
};

export type MissionDebriefAction = {
  id: string;
  text: string;
  owner: string | null;
  priority: DebriefActionPriority;
  dueAt: string | null;
  relatedPerson: string | null;
  relatedOrganization: string | null;
  relatedCommitmentId: string | null;
  relatedFollowUpId: string | null;
  source: DebriefActionSource;
  approvedForFollowUp: boolean;
  completed: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
};

export type MissionDebriefRecord = {
  id: string;
  missionId: string;
  debriefStatus: MissionDebriefStatus;
  outcomeAssessment: MissionOutcomeAssessment;
  outcomeSummary: string | null;
  criterionAssessments: MissionCriterionAssessment[];
  peopleOutcomes: MissionPersonOutcome[];
  organizationOutcomes: MissionOrganizationOutcome[];
  commitmentReviews: MissionCommitmentReview[];
  followUpReviews: MissionFollowUpReview[];
  whatWorked: MissionLessonItem[];
  whatDidNotWork: MissionLessonItem[];
  lessonsLearned: MissionLesson[];
  strategicInsights: MissionStrategicInsight[];
  unresolvedQuestions: MissionUnresolvedQuestion[];
  recommendedNextSteps: MissionDebriefAction[];
  internalNotes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  startedByUserId: string | null;
  completedByUserId: string | null;
  approvedByUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DebriefPatchSection =
  | "start"
  | "outcome"
  | "criteria"
  | "peopleOutcomes"
  | "organizationOutcomes"
  | "commitmentReviews"
  | "followUpReviews"
  | "whatWorked"
  | "whatDidNotWork"
  | "lessons"
  | "insights"
  | "questions"
  | "nextActions"
  | "notes"
  | "complete"
  | "approve"
  | "reopen"
  | "all";

export type DebriefPatchInput = {
  section: DebriefPatchSection;
  outcomeAssessment?: MissionOutcomeAssessment;
  outcomeSummary?: string | null;
  criterionAssessments?: MissionCriterionAssessment[];
  peopleOutcomes?: MissionPersonOutcome[];
  organizationOutcomes?: MissionOrganizationOutcome[];
  commitmentReviews?: MissionCommitmentReview[];
  followUpReviews?: MissionFollowUpReview[];
  whatWorked?: MissionLessonItem[];
  whatDidNotWork?: MissionLessonItem[];
  lessonsLearned?: MissionLesson[];
  strategicInsights?: MissionStrategicInsight[];
  unresolvedQuestions?: MissionUnresolvedQuestion[];
  recommendedNextSteps?: MissionDebriefAction[];
  internalNotes?: string | null;
};

export const DEBRIEF_TEXT_MAX = 4000;
export const DEBRIEF_ITEM_TEXT_MAX = 800;
export const DEBRIEF_LIST_MAX = 80;

export const FORBIDDEN_DEBRIEF_KEYS = [
  "startsAt",
  "endsAt",
  "timezone",
  "city",
  "venueName",
  "streetAddress",
  "location",
  "lifecyclePhase",
  "missionStatus",
  "readinessState",
  "executionStatus",
  "strategicPurpose",
  "keyMessage",
  "liveObservations",
  "peopleContacts",
  "organizationContacts",
  "commitments",
  "immediateFollowUps",
  "fieldNotes",
] as const;
