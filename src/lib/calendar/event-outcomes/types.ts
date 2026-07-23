/**
 * IC-02A Event Outcome / Hot Wash — pure types and constants.
 * Schedule ≠ attendance ≠ operational completion ≠ Mission execution ≠ review completion.
 */

export const EVENT_OUTCOME_BUILD_ID =
  "KCCC-IC-02A-EVENT-OUTCOME-HOT-WASH-1.0" as const;

export const EVENT_OUTCOME_CAMPAIGN_SCOPE = "KELLY" as const;

/** Deterministic eligibility surface — never implies completion or attendance. */
export type EventReviewEligibility =
  | "NOT_YET_DUE"
  | "REVIEW_DUE"
  | "DRAFT"
  | "REVIEWED"
  | "STALE"
  | "NOT_APPLICABLE";

export type EventAttendanceOutcomeCode =
  | "ATTENDED"
  | "PARTIALLY_ATTENDED"
  | "NOT_ATTENDED"
  | "CANCELLED"
  | "POSTPONED"
  | "EVENT_DID_NOT_OCCUR"
  | "UNKNOWN"
  | "NOT_APPLICABLE";

export type EventOperationalOutcomeCode =
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "UNSUCCESSFUL"
  | "RESCHEDULE_NEEDED"
  | "FOLLOW_UP_REQUIRED"
  | "NO_CAMPAIGN_ACTION"
  | "UNKNOWN";

export type EventOutcomeReviewStatusCode =
  | "DRAFT"
  | "REVIEWED"
  | "STALE"
  | "ARCHIVED";

export type EventHotWashEntryTypeCode =
  | "WHAT_HAPPENED"
  | "TAKEAWAY"
  | "WIN"
  | "CHALLENGE"
  | "COMMITMENT"
  | "FOLLOW_UP"
  | "CONTACT_ENCOUNTER"
  | "ORGANIZATION_ENCOUNTER"
  | "ISSUE"
  | "CORRECTION"
  | "NOTE";

export type EventOutcomePrivacyClassCode =
  | "INTERNAL"
  | "LEADERSHIP"
  | "CONFIDENTIAL";

export type EventEncounterContactReviewStatusCode =
  | "NOT_REQUESTED"
  | "AWAITING_REVIEW"
  | "DECLINED"
  | "CONVERTED_TO_CONTACT_WORKFLOW";

export const ATTENDANCE_OUTCOMES: readonly EventAttendanceOutcomeCode[] = [
  "ATTENDED",
  "PARTIALLY_ATTENDED",
  "NOT_ATTENDED",
  "CANCELLED",
  "POSTPONED",
  "EVENT_DID_NOT_OCCUR",
  "UNKNOWN",
  "NOT_APPLICABLE",
] as const;

export const OPERATIONAL_OUTCOMES: readonly EventOperationalOutcomeCode[] = [
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "UNSUCCESSFUL",
  "RESCHEDULE_NEEDED",
  "FOLLOW_UP_REQUIRED",
  "NO_CAMPAIGN_ACTION",
  "UNKNOWN",
] as const;

export const HOT_WASH_ENTRY_TYPES: readonly EventHotWashEntryTypeCode[] = [
  "WHAT_HAPPENED",
  "TAKEAWAY",
  "WIN",
  "CHALLENGE",
  "COMMITMENT",
  "FOLLOW_UP",
  "CONTACT_ENCOUNTER",
  "ORGANIZATION_ENCOUNTER",
  "ISSUE",
  "CORRECTION",
  "NOTE",
] as const;

/** Calendar indicator labels — restrained; never replace Event titles. */
export const OUTCOME_INDICATORS = {
  REVIEW_DUE: "Review due",
  DRAFT: "Hot wash draft",
  REVIEWED: "Reviewed",
  STALE: "Outcome stale",
  FOLLOW_UP_NEEDED: "Follow-up needed",
} as const;

export type ScheduleSnapshotInput = {
  startsAt: Date | string;
  endsAt: Date | string;
  timezone: string;
  isAllDay: boolean;
  status?: string | null;
};

export type ExistingOutcomeSnapshot = {
  status: EventOutcomeReviewStatusCode;
  scheduledFingerprint: string;
  archivedAt?: Date | string | null;
} | null;

export type EligibilityResult = {
  eligibility: EventReviewEligibility;
  effectiveEndAt: Date;
  campaignDateKey: string;
  scheduledFingerprint: string;
  scheduleChanged: boolean;
  /** True when wall-clock end has passed (or cancelled/postponed reviewable). */
  timeGatePassed: boolean;
  reason: string;
};
