/**
 * V2.1 Prepare Mode — operator-owned briefing types.
 * Distinct from MissionLifecyclePhase and MissionOperationalStatus.
 */

export const PREPARATION_READINESS_STATES = [
  "DRAFT",
  "NEEDS_ATTENTION",
  "READY",
] as const;

export type PreparationReadinessState =
  (typeof PREPARATION_READINESS_STATES)[number];

export type PreparationListItem = {
  id: string;
  text: string;
};

export type PreparationPersonBriefing = {
  id: string;
  name: string;
  roleOrTitle: string | null;
  organization: string | null;
  relationshipToCampaign: string | null;
  whyTheyMatter: string | null;
  lastMeaningfulContact: string | null;
  conversationGoal: string | null;
  notes: string | null;
  sourceNote: string | null;
  linkedPersonId: string | null;
};

export type PreparationOrganizationBriefing = {
  id: string;
  name: string;
  organizationType: string | null;
  relationshipToMission: string | null;
  campaignRelationship: string | null;
  keyConcern: string | null;
  desiredOutcome: string | null;
  notes: string | null;
  sourceNote: string | null;
};

export type PreparationTask = {
  id: string;
  label: string;
  owner: string | null;
  dueAt: string | null;
  completed: boolean;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MissionPreparationRecord = {
  id: string;
  missionId: string;
  briefingSummary: string | null;
  strategicPurpose: string | null;
  desiredImpression: string | null;
  keyMessage: string | null;
  openingApproach: string | null;
  closingApproach: string | null;
  questionsToAsk: PreparationListItem[];
  talkingPoints: PreparationListItem[];
  thingsToNotice: PreparationListItem[];
  sensitivities: PreparationListItem[];
  commitmentsToAvoid: PreparationListItem[];
  storiesOrExamples: PreparationListItem[];
  peopleBriefings: PreparationPersonBriefing[];
  organizationBriefings: PreparationOrganizationBriefing[];
  logisticsNotes: string | null;
  arrivalInstructions: string | null;
  parkingInstructions: string | null;
  entryContact: string | null;
  attireNotes: string | null;
  accessibilityNotes: string | null;
  travelNotes: string | null;
  lodgingNotes: string | null;
  materialsNeeded: PreparationListItem[];
  preparationTasks: PreparationTask[];
  operatorNotes: string | null;
  readinessState: PreparationReadinessState;
  markedReadyAt: string | null;
  markedReadyByUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Allowed PATCH sections — never Event schedule fields. */
export type PreparationPatchSection =
  | "strategy"
  | "message"
  | "people"
  | "organizations"
  | "logistics"
  | "tasks"
  | "notes"
  | "readiness"
  | "all";

export type PreparationPatchInput = {
  section: PreparationPatchSection;
  briefingSummary?: string | null;
  strategicPurpose?: string | null;
  desiredImpression?: string | null;
  keyMessage?: string | null;
  openingApproach?: string | null;
  closingApproach?: string | null;
  questionsToAsk?: PreparationListItem[];
  talkingPoints?: PreparationListItem[];
  thingsToNotice?: PreparationListItem[];
  sensitivities?: PreparationListItem[];
  commitmentsToAvoid?: PreparationListItem[];
  storiesOrExamples?: PreparationListItem[];
  peopleBriefings?: PreparationPersonBriefing[];
  organizationBriefings?: PreparationOrganizationBriefing[];
  logisticsNotes?: string | null;
  arrivalInstructions?: string | null;
  parkingInstructions?: string | null;
  entryContact?: string | null;
  attireNotes?: string | null;
  accessibilityNotes?: string | null;
  travelNotes?: string | null;
  lodgingNotes?: string | null;
  materialsNeeded?: PreparationListItem[];
  preparationTasks?: PreparationTask[];
  operatorNotes?: string | null;
  readinessState?: PreparationReadinessState;
};

export type PreparationReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
};

// Re-export workspace view from workspace.ts via index for consumers.

export const PREPARATION_TEXT_MAX = 4000;
export const PREPARATION_LIST_MAX = 40;
export const PREPARATION_ITEM_TEXT_MAX = 500;
export const FORBIDDEN_SCHEDULE_KEYS = [
  "startsAt",
  "endsAt",
  "timezone",
  "city",
  "venueName",
  "streetAddress",
  "location",
  "eventStartsAt",
  "eventEndsAt",
] as const;
