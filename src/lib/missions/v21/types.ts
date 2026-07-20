import type {
  MISSION_FIELD_SOURCES,
  MISSION_LIFECYCLE_PHASES,
  MISSION_OPERATIONAL_STATUSES,
  MISSION_PROJECTION_VERSION,
} from "@/lib/missions/v21/constants";

export type MissionLifecyclePhase = (typeof MISSION_LIFECYCLE_PHASES)[number];
export type MissionOperationalStatus =
  (typeof MISSION_OPERATIONAL_STATUSES)[number];
export type MissionFieldSource = (typeof MISSION_FIELD_SOURCES)[number];
export type MissionProjectionVersion = typeof MISSION_PROJECTION_VERSION;

/** Structured campaign intelligence — never invent facts; null/empty = unknown. */
export type MissionIntelligence = {
  county: string | null;
  city: string | null;
  region: string | null;
  organizations: string[];
  churches: string[];
  businesses: string[];
  officials: string[];
  media: string[];
  schools: string[];
  targetVoters: string[];
  issues: string[];
  fundraisingNotes: string | null;
  volunteerNotes: string | null;
  petitions: string[];
  press: string[];
  opposition: string[];
  priority: string | null;
  expectedRoi: string | null;
  expectedAttendance: number | null;
  eventType: string | null;
  eventSubtype: string | null;
  candidateRole: string | null;
  venueName: string | null;
};

export type MissionCompleteness = {
  hasObjective: boolean;
  hasSuccessCriteria: boolean;
  hasGeography: boolean;
  hasIntelligenceSignal: boolean;
  isDraftValid: boolean;
  unknownFields: string[];
};

export type MissionSuccessCriterion = {
  text: string;
  source: MissionFieldSource;
};

/**
 * V2.1 Mission record shape (in-memory + persisted).
 * Does not replace Event; projects from it.
 */
export type CampaignMission = {
  id: string | null;
  sourceEventId: string;
  sourceEventNumber: string;
  sourceEventVersion: number;
  projectionVersion: MissionProjectionVersion;
  attendTitle: string;
  objective: string | null;
  objectiveSource: MissionFieldSource;
  successCriteria: MissionSuccessCriterion[];
  missionStatus: MissionOperationalStatus;
  lifecyclePhase: MissionLifecyclePhase;
  intelligence: MissionIntelligence;
  completeness: MissionCompleteness;
  /** ISO timestamps from source event (scheduling unchanged). */
  startsAt: string;
  endsAt: string;
  timezone: string;
  /** Operator-owned fields are never overwritten by backfill. */
  operatorOwnedFields: string[];
  projectedAt: string;
};

/** Minimal legacy event DTO for deterministic projection (no Prisma import). */
export type EventMissionSource = {
  id: string;
  eventNumber: string;
  version: number;
  internalTitle: string;
  campaignDisplayTitle: string;
  eventType: string | null;
  eventSubtype: string | null;
  status: string;
  priority: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  city: string | null;
  countyName: string | null;
  regionName: string | null;
  venueName: string | null;
  expectedAttendance: number | null;
  candidateRole: string | null;
  objectives: Array<{
    isPrimary: boolean;
    objectiveType: string;
    description: string | null;
    successDefinition: string | null;
    targetAudience: string | null;
    desiredOutcome: string | null;
    priority: string | null;
  }>;
  organizations: Array<{
    name: string;
    organizationType: string | null;
    role: string;
  }>;
  people: Array<{
    displayName: string;
    role: string;
    title: string | null;
  }>;
  followupCount: number;
  hasOutcome: boolean;
  travelRequired: boolean;
};

export type LegacyEventSnapshot = {
  eventId: string;
  eventNumber: string;
  version: number;
  campaignDisplayTitle: string;
  internalTitle: string;
  status: string;
  priority: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  city: string | null;
  countyName: string | null;
  regionName: string | null;
  eventType: string | null;
  objectivesCount: number;
  primaryObjective: string | null;
  successDefinition: string | null;
};

export type MissionProjectionComparison = {
  legacyEvent: LegacyEventSnapshot;
  mission: CampaignMission;
  /** Explicit field mapping for operator review — never silent. */
  fieldMap: Array<{
    missionField: string;
    legacySource: string;
    valueSummary: string;
    status: "MAPPED" | "UNKNOWN" | "DEFAULT";
  }>;
};
