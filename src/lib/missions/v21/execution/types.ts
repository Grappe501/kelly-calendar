/**
 * V2.1 Execute Mode — field capture types.
 * Distinct from MissionLifecyclePhase, MissionOperationalStatus, and PreparationReadiness.
 */

export const EXECUTION_STATUSES = [
  "NOT_STARTED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export type MissionExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const OBSERVATION_CATEGORIES = [
  "GENERAL",
  "ISSUE",
  "RELATIONSHIP",
  "OPPORTUNITY",
  "CONCERN",
  "LOGISTICS",
  "MEDIA",
] as const;

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number];

export const PERSON_CONTACT_STATES = ["NOT_SEEN", "SPOKE_WITH", "MISSED"] as const;
export type PersonContactState = (typeof PERSON_CONTACT_STATES)[number];

export const ORG_CONTACT_STATES = [
  "NOT_ENGAGED",
  "ENGAGED",
  "FOLLOW_UP_NEEDED",
] as const;
export type OrgContactState = (typeof ORG_CONTACT_STATES)[number];

export const FOLLOW_UP_PRIORITIES = ["NORMAL", "IMPORTANT", "URGENT"] as const;
export type FollowUpPriority = (typeof FOLLOW_UP_PRIORITIES)[number];

export type MissionObservation = {
  id: string;
  text: string;
  category: ObservationCategory | null;
  important: boolean;
  createdAt: string;
  createdByUserId: string | null;
};

export type MissionPersonContact = {
  id: string;
  /** Links to Prepare peopleBriefing id when available */
  preparePersonId: string | null;
  name: string;
  state: PersonContactState;
  note: string | null;
  updatedAt: string;
};

export type MissionOrganizationContact = {
  id: string;
  prepareOrganizationId: string | null;
  name: string;
  state: OrgContactState;
  note: string | null;
  updatedAt: string;
};

export type MissionCommitment = {
  id: string;
  text: string;
  madeTo: string | null;
  owner: string | null;
  dueAt: string | null;
  needsFollowUp: boolean;
  completed: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
};

export type MissionImmediateFollowUp = {
  id: string;
  text: string;
  relatedTo: string | null;
  owner: string | null;
  priority: FollowUpPriority;
  dueAt: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
};

export type MissionExecutionRecord = {
  id: string;
  missionId: string;
  executionStatus: MissionExecutionStatus;
  arrivedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  arrivalNote: string | null;
  liveObservations: MissionObservation[];
  peopleContacts: MissionPersonContact[];
  organizationContacts: MissionOrganizationContact[];
  commitments: MissionCommitment[];
  immediateFollowUps: MissionImmediateFollowUp[];
  fieldNotes: string | null;
  arrivedByUserId: string | null;
  startedByUserId: string | null;
  completedByUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExecutionPatchSection =
  | "arrive"
  | "start"
  | "complete"
  | "arrivalNote"
  | "observations"
  | "peopleContacts"
  | "organizationContacts"
  | "commitments"
  | "immediateFollowUps"
  | "fieldNotes"
  | "all";

export type ExecutionPatchInput = {
  section: ExecutionPatchSection;
  arrivalNote?: string | null;
  liveObservations?: MissionObservation[];
  peopleContacts?: MissionPersonContact[];
  organizationContacts?: MissionOrganizationContact[];
  commitments?: MissionCommitment[];
  immediateFollowUps?: MissionImmediateFollowUp[];
  fieldNotes?: string | null;
  /** For arrive/start/complete — optional note on arrive */
  note?: string | null;
};

export const EXECUTION_TEXT_MAX = 4000;
export const EXECUTION_ITEM_TEXT_MAX = 500;
export const EXECUTION_LIST_MAX = 80;
export const FORBIDDEN_EXECUTION_KEYS = [
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
  "strategicPurpose",
  "keyMessage",
] as const;
