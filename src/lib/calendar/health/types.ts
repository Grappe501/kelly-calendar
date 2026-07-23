/**
 * CC-11 Calendar Health — shared types (pure; no Prisma / server-only).
 * Observe/explain only — never mutates Events, Missions, or feeds.
 */

export const CALENDAR_HEALTH_DETECTOR_VERSION = "CC-11-HEALTH-1.0" as const;

export const HEALTH_DOMAINS = [
  "events",
  "imports",
  "integrity",
  "time",
  "recurrence",
  "availability",
  "conflicts",
  "search",
  "scheduling",
  "bulk",
  "ics",
  "jobs",
] as const;

export type HealthDomain = (typeof HEALTH_DOMAINS)[number];

export const MANDATORY_DOMAINS = {
  FULL: [...HEALTH_DOMAINS] as readonly HealthDomain[],
  LIGHTWEIGHT: [
    "events",
    "imports",
    "integrity",
    "jobs",
    "ics",
  ] as readonly HealthDomain[],
} as const;

export const CALENDAR_HEALTH_OVERALL_STATES = [
  "HEALTHY",
  "DEGRADED",
  "UNHEALTHY",
  "UNKNOWN",
  "PARTIAL",
  "NOT_CONFIGURED",
] as const;
export type CalendarHealthOverallState =
  (typeof CALENDAR_HEALTH_OVERALL_STATES)[number];

export const CALENDAR_HEALTH_RUN_STATUSES = [
  "STARTED",
  "RUNNING",
  "COMPLETED",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
] as const;
export type CalendarHealthRunStatus =
  (typeof CALENDAR_HEALTH_RUN_STATUSES)[number];

export const CALENDAR_HEALTH_RUN_TYPES = [
  "MANUAL",
  "SCHEDULED",
  "FOCUSED",
] as const;
export type CalendarHealthRunType = (typeof CALENDAR_HEALTH_RUN_TYPES)[number];

export const CALENDAR_HEALTH_ALERT_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "SUPPRESSED",
  "STALE",
] as const;
export type CalendarHealthAlertStatus =
  (typeof CALENDAR_HEALTH_ALERT_STATUSES)[number];

export const HEALTH_SEVERITIES = [
  "CRITICAL",
  "WARNING",
  "INFO",
] as const;
export type HealthSeverity = (typeof HEALTH_SEVERITIES)[number];

export const HEALTH_FINDING_STATUSES = [
  "OPEN",
  "RESOLVED",
  "STALE",
  "UNKNOWN",
] as const;
export type HealthFindingStatus = (typeof HEALTH_FINDING_STATUSES)[number];

export const HEALTH_FINDING_TRENDS = [
  "NEW",
  "CONTINUING",
  "WORSENED",
  "IMPROVED",
  "RESOLVED",
  "REOPENED",
  "STALE",
  "UNKNOWN",
] as const;
export type HealthFindingTrend = (typeof HEALTH_FINDING_TRENDS)[number];

export type HealthConfigState =
  | "OK"
  | "MISSING_DATABASE"
  | "MISSING_SECRET"
  | "NOT_CONFIGURED"
  | (string & {});

export type DeriveOverallHealthStateInput = {
  mandatoryExpected: number;
  mandatoryCompleted: number;
  mandatoryFailed: number;
  mandatorySkipped: number;
  truncated: boolean;
  criticalFindings: number;
  warningFindings: number;
  configState?: string | null;
};

export type HealthFindingDraft = {
  domain: HealthDomain | string;
  findingKey: string;
  findingType: string;
  severity: HealthSeverity | string;
  certainty?: string;
  status?: HealthFindingStatus | string;
  summary: string;
  evidenceFingerprint: string;
  relatedRefType?: string | null;
  relatedRefId?: string | null;
  integrityFindingId?: string | null;
  trend?: HealthFindingTrend | string | null;
};

export type HealthAlertDraft = {
  findingKey: string;
  alertType: string;
  severity: HealthSeverity | string;
  status?: CalendarHealthAlertStatus;
  summary: string;
};
