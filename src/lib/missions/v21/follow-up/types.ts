/**
 * V2.1 Follow-up Mode — Mission-scoped accountability types.
 * Distinct from lifecycle, ops status, prep readiness, execution, and debrief status.
 */

export const FOLLOW_UP_WORKSPACE_STATUSES = [
  "NOT_STARTED",
  "ACTIVE",
  "READY_TO_CLOSE",
  "CLOSED",
] as const;
export type MissionFollowUpStatus = (typeof FOLLOW_UP_WORKSPACE_STATUSES)[number];

export const FOLLOW_UP_ACTION_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type MissionFollowUpActionStatus =
  (typeof FOLLOW_UP_ACTION_STATUSES)[number];

export const FOLLOW_UP_ACTION_PRIORITIES = [
  "NORMAL",
  "IMPORTANT",
  "URGENT",
] as const;
export type MissionFollowUpPriority =
  (typeof FOLLOW_UP_ACTION_PRIORITIES)[number];

export const FOLLOW_UP_SOURCE_TYPES = [
  "EXECUTE_COMMITMENT",
  "EXECUTE_IMMEDIATE_FOLLOW_UP",
  "PERSON_RELATIONSHIP_NEXT_STEP",
  "ORGANIZATION_RELATIONSHIP_NEXT_STEP",
  "UNRESOLVED_QUESTION",
  "SUCCESS_CRITERION_RECOVERY",
  "LESSON_ACTION",
  "DEBRIEF_RECOMMENDED_ACTION",
  "OPERATOR_ADDED",
  "MISSION_INCIDENT",
] as const;
export type MissionFollowUpSourceType = (typeof FOLLOW_UP_SOURCE_TYPES)[number];

export const FOLLOW_UP_OWNER_TYPES = [
  "USER",
  "ROLE",
  "EXTERNAL",
  "UNASSIGNED",
] as const;
export type MissionFollowUpOwnerType = (typeof FOLLOW_UP_OWNER_TYPES)[number];

export const EVIDENCE_TYPES = [
  "NOTE",
  "CONTACT_CONFIRMED",
  "DOCUMENT",
  "LINK",
  "MEETING_COMPLETED",
  "INFORMATION_DELIVERED",
  "INTRODUCTION_MADE",
  "DECISION_RECORDED",
  "OTHER",
] as const;
export type FollowUpEvidenceType = (typeof EVIDENCE_TYPES)[number];

export type FollowUpEvidenceEntry = {
  id: string;
  type: FollowUpEvidenceType;
  note: string;
  reference: string | null;
  createdAt: string;
  createdByUserId: string | null;
};

export type MissionFollowUpActionRecord = {
  id: string;
  followUpId: string;
  sourceType: MissionFollowUpSourceType;
  sourceRecordId: string | null;
  importKey: string | null;
  sourceSnapshot: Record<string, unknown> | null;
  title: string;
  description: string | null;
  status: MissionFollowUpActionStatus;
  priority: MissionFollowUpPriority;
  ownerType: MissionFollowUpOwnerType;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerRole: string | null;
  relatedPersonName: string | null;
  relatedOrganizationName: string | null;
  dueAt: string | null;
  nextCheckAt: string | null;
  waitingReason: string | null;
  blockedReason: string | null;
  completionSummary: string | null;
  completionEvidence: FollowUpEvidenceEntry[];
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  completedByUserId: string | null;
  cancelledByUserId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MissionFollowUpRecord = {
  id: string;
  missionId: string;
  followUpStatus: MissionFollowUpStatus;
  startedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  closeoutSummary: string | null;
  unresolvedSummary: string | null;
  internalNotes: string | null;
  startedByUserId: string | null;
  closedByUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  actions: MissionFollowUpActionRecord[];
};

export type FollowUpPatchSection =
  | "start"
  | "import"
  | "notes"
  | "addAction"
  | "updateAction"
  | "completeAction"
  | "cancelAction"
  | "readyToClose"
  | "close"
  | "all";

export type FollowUpPatchInput = {
  section: FollowUpPatchSection;
  closeoutSummary?: string | null;
  unresolvedSummary?: string | null;
  internalNotes?: string | null;
  action?: Partial<MissionFollowUpActionRecord> & {
    id?: string;
    expectedUpdatedAt?: string | null;
  };
  evidenceNote?: string | null;
  evidenceType?: FollowUpEvidenceType;
  cancellationReason?: string | null;
};

export const FOLLOW_UP_TEXT_MAX = 4000;
export const FOLLOW_UP_TITLE_MAX = 300;
export const FOLLOW_UP_LIST_MAX = 120;

export const FORBIDDEN_FOLLOW_UP_KEYS = [
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
  "debriefStatus",
  "outcomeAssessment",
  "strategicPurpose",
  "keyMessage",
  "liveObservations",
  "peopleContacts",
  "commitments",
  "immediateFollowUps",
] as const;

export function buildImportKey(
  missionId: string,
  sourceType: MissionFollowUpSourceType,
  sourceRecordId: string,
): string {
  return `${missionId}::${sourceType}::${sourceRecordId}`;
}
