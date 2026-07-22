/**
 * CC-05 Standing Availability — pure types and CC-06-consumable contract.
 * Build: KCCC-CC-05-STANDING-AVAILABILITY-INPUTS-1.0
 */

export const AVAILABILITY_DOCTRINE_VERSION = "CC-05-1.0";

export type AvailabilityClassification =
  | "AVAILABLE"
  | "PREFERRED"
  | "CONSTRAINED"
  | "UNAVAILABLE"
  | "UNKNOWN"
  | "REQUIRES_REVIEW";

export type AvailabilitySeverity = "blocking" | "warning" | "informational";

export type AvailabilityInterval = {
  startsAt: Date;
  endsAt: Date;
  classification: AvailabilityClassification;
  ruleId?: string;
  exceptionId?: string;
  label: string;
  /** Public-safe explanation (no sensitive reason). */
  explanation: string;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
};

export type AvailabilityFinding = {
  key: string;
  severity: AvailabilitySeverity;
  classification: AvailabilityClassification;
  ruleId?: string;
  exceptionId?: string;
  overlapStartsAt: Date;
  overlapEndsAt: Date;
  explanation: string;
  blocksSave: boolean;
  requiresAcknowledgement: boolean;
};

/** CC-06 input contract — do not persist OperationalConflictRecord from CC-05. */
export type AvailabilityAssessment = {
  classification: AvailabilityClassification;
  findings: AvailabilityFinding[];
  applicableIntervals: AvailabilityInterval[];
  ruleSetFingerprint: string;
  evaluationFingerprint: string;
  truncated: boolean;
  evaluatedAt: string;
};

export type AvailabilityRuleSnapshot = {
  id: string;
  campaignKey: string;
  subjectType: string;
  subjectUserId?: string | null;
  ruleType: string;
  classification: AvailabilityClassification;
  timezone: string;
  effectiveStartDate: string;
  effectiveEndDate?: string | null;
  startLocalTime?: string | null;
  endLocalTime?: string | null;
  weekdays: number[];
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priority: number;
  approvalState: string;
  ruleFingerprint: string;
  label: string;
  locationHint?: string | null;
  isActive: boolean;
};

export type AvailabilityExceptionSnapshot = {
  id: string;
  campaignKey: string;
  ruleId?: string | null;
  subjectType: string;
  startDate: string;
  endDateExclusive: string;
  startLocalTime?: string | null;
  endLocalTime?: string | null;
  isAllDay: boolean;
  timezone: string;
  classification: AvailabilityClassification;
  label: string;
  approvalState: string;
  exceptionFingerprint: string;
  isActive: boolean;
};

/** Precedence rank — lower wins (more specific / harder). */
export const AVAILABILITY_PRECEDENCE: Record<string, number> = {
  EXCEPTION: 1,
  UNAVAILABLE: 2,
  BLACKOUT: 2,
  VACATION: 2,
  PROTECTED_WORK: 3,
  OFFICE_HOURS: 3,
  TRAVEL_BUFFER: 4,
  PREPARATION_BUFFER: 4,
  RECOVERY_BUFFER: 4,
  CONSTRAINED: 5,
  PREFERRED: 6,
  AVAILABLE: 7,
  UNKNOWN: 8,
};

export function classificationSeverity(
  c: AvailabilityClassification,
): AvailabilitySeverity {
  if (c === "UNAVAILABLE") return "blocking";
  if (c === "CONSTRAINED" || c === "REQUIRES_REVIEW") return "warning";
  return "informational";
}

export function classificationBlocksSave(c: AvailabilityClassification): boolean {
  return c === "UNAVAILABLE";
}
