/** V2.1 Mission projection contract version (deterministic). */
export const MISSION_PROJECTION_VERSION = "v2.1.0" as const;

export const MISSION_LIFECYCLE_PHASES = [
  "PREPARE",
  "TRAVEL",
  "EXECUTE",
  "DEBRIEF",
  "FOLLOW_UP",
  "COMPLETE",
] as const;

export const MISSION_OPERATIONAL_STATUSES = [
  "DRAFT",
  "PREPARING",
  "READY",
  "IN_PROGRESS",
  "DEBRIEFING",
  "FOLLOW_UP",
  "COMPLETE",
  "CANCELLED",
  "ARCHIVED",
] as const;

export const MISSION_FIELD_SOURCES = [
  "EVENT",
  "OBJECTIVE",
  "ORGANIZATION",
  "PERSON",
  "OPERATOR",
  "UNKNOWN",
] as const;
