/**
 * CC-02 Calendar Integrity — shared types (pure; no Prisma / server-only).
 * Detection version is stable for persisted findings and CC-11 reuse.
 */

export const CALENDAR_INTEGRITY_BUILD_ID =
  "KCCC-CC-02-CALENDAR-INTEGRITY-PROVENANCE-CONSOLE-1.0" as const;

export const CALENDAR_INTEGRITY_DETECTOR_VERSION = "CC-02-DETECTOR-1.0" as const;

export const INTEGRITY_SEVERITIES = [
  "CRITICAL",
  "ERROR",
  "WARNING",
  "INFO",
] as const;
export type IntegritySeverity = (typeof INTEGRITY_SEVERITIES)[number];

export const INTEGRITY_DISPOSITIONS = [
  "ACKNOWLEDGED",
  "ACCEPTED_RISK",
  "RESOLVED",
  "NOT_APPLICABLE",
] as const;
export type IntegrityDisposition = (typeof INTEGRITY_DISPOSITIONS)[number];

export const INTEGRITY_FINDING_TYPES = [
  // Duplicates
  "EXACT_DUPLICATE_GROUP",
  "NEAR_DUPLICATE_CANDIDATE",
  "SHARED_EXTERNAL_IDENTITY",
  "ACTIVE_CANCELLED_CLONE",
  "INGEST_KEY_CLONE",
  "RECURRENCE_OCCURRENCE_DUPLICATE",
  // Provenance
  "IMPORTED_WITHOUT_IDENTITY",
  "ORPHANED_EXTERNAL_IDENTITY",
  "MISSING_IMPORT_LINKAGE",
  "LEGACY_INGEST_KEY_ONLY",
  "MULTIPLE_ACTIVE_IDENTITIES",
  "IMPORT_WITHOUT_AUDIT",
  // Import integrity
  "APPROVED_WITHOUT_EVENT",
  "APPROVED_MULTI_EVENT",
  "INVALID_MERGE_TARGET",
  "STRANDED_STAGED_RECORD",
  "PARTIAL_RUN_APPLIED",
  "RUN_COUNT_MISMATCH",
  "SOURCE_DELETED_LOCAL_ACTIVE",
  "LOCAL_MARKED_IMPORTED_FALSELY",
  // Drift
  "SOURCE_LOCAL_DRIFT",
  "ADR081_PROTECTED_LOCAL_FIELDS",
  "UNRESOLVABLE_FIELD_CONFLICT",
  // Lifecycle / mission boundary
  "STATUS_HISTORY_MISMATCH",
  "MISSING_CANCELLATION_HISTORY",
  "ORPHANED_CALENDAR_MEMBERSHIP",
  "MISSING_PRIMARY_MEMBERSHIP",
  "DUPLICATE_MEMBERSHIP",
  "MISSION_BOUNDARY_ANOMALY",
  // Time / recurrence warnings (report only — CC-03/CC-04 own repair)
  "END_BEFORE_START",
  "MISSING_OR_INVALID_TIMEZONE",
  "CROSS_MIDNIGHT_START_DAY_BIAS",
  "SUSPICIOUS_ALL_DAY",
  "MISSING_SERIES_IDENTITY",
  "DUPLICATE_SERIES_IDENTITY",
  "UNSUPPORTED_RECURRENCE_RULE",
] as const;

export type IntegrityFindingType = (typeof INTEGRITY_FINDING_TYPES)[number];

export type DriftClassification =
  | "SOURCE_UNCHANGED_LOCAL_UNCHANGED"
  | "SOURCE_CHANGED_LOCAL_UNCHANGED"
  | "SOURCE_UNCHANGED_LOCAL_CHANGED"
  | "SOURCE_AND_LOCAL_CHANGED"
  | "SOURCE_DELETED_LOCAL_ACTIVE"
  | "SOURCE_ACTIVE_LOCAL_CANCELLED"
  | "UNKNOWN";

export type IntegrityFindingDraft = {
  findingType: IntegrityFindingType;
  findingKey: string;
  severity: IntegritySeverity;
  summary: string;
  evidence: Record<string, unknown>;
  primaryEventId: string | null;
  relatedEventIds: string[];
  externalSourceId: string | null;
  externalIdentityId: string | null;
  importRunId: string | null;
  importRecordId: string | null;
  repairAvailable: boolean;
  detectionVersion: typeof CALENDAR_INTEGRITY_DETECTOR_VERSION;
};

export type IntegrityScanScope =
  | "EVENT"
  | "IMPORT_RUN"
  | "SOURCE"
  | "DATE_RANGE"
  | "FULL";

/** Soft cap for full/range scans — report truncation when hit. */
export const INTEGRITY_SCAN_EVENT_SOFT_LIMIT = 2500;
export const INTEGRITY_SCAN_DEFAULT_RANGE_DAYS = 120;
