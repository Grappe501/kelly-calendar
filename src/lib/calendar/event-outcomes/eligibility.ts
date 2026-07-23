/**
 * IC-02A — deterministic Event review eligibility.
 *
 * Fundamental rule: time passing → REVIEW_DUE (or existing draft/reviewed/stale),
 * never automatic COMPLETED / NOT_ATTENDED / Mission mutation.
 * Pure function — zero database writes.
 */

import {
  buildScheduledFingerprint,
  effectiveReviewEndAt,
  hasScheduledEndPassed,
  isArchivedStatus,
  isCancelledOrPostponedStatus,
  primaryCampaignDateKey,
} from "@/lib/calendar/event-outcomes/fingerprint";
import type {
  EligibilityResult,
  ExistingOutcomeSnapshot,
  ScheduleSnapshotInput,
} from "@/lib/calendar/event-outcomes/types";

export type EvaluateEligibilityInput = {
  schedule: ScheduleSnapshotInput;
  now: Date;
  existing?: ExistingOutcomeSnapshot;
};

export function evaluateEventReviewEligibility(
  input: EvaluateEligibilityInput,
): EligibilityResult {
  const { schedule, now, existing } = input;
  const fingerprint = buildScheduledFingerprint(schedule);
  const effectiveEndAt = effectiveReviewEndAt(schedule);
  const campaignDateKey = primaryCampaignDateKey(schedule);
  const scheduleChanged =
    Boolean(existing?.scheduledFingerprint) &&
    existing!.scheduledFingerprint !== fingerprint;

  if (isArchivedStatus(schedule.status) || existing?.archivedAt) {
    return {
      eligibility: "NOT_APPLICABLE",
      effectiveEndAt,
      campaignDateKey,
      scheduledFingerprint: fingerprint,
      scheduleChanged,
      timeGatePassed: false,
      reason: "Event or review is archived.",
    };
  }

  if (existing) {
    if (existing.status === "ARCHIVED") {
      return {
        eligibility: "NOT_APPLICABLE",
        effectiveEndAt,
        campaignDateKey,
        scheduledFingerprint: fingerprint,
        scheduleChanged,
        timeGatePassed: hasScheduledEndPassed(schedule, now),
        reason: "Outcome review archived.",
      };
    }
    if (scheduleChanged || existing.status === "STALE") {
      return {
        eligibility: "STALE",
        effectiveEndAt,
        campaignDateKey,
        scheduledFingerprint: fingerprint,
        scheduleChanged: true,
        timeGatePassed: true,
        reason: scheduleChanged
          ? "Material schedule change since last review fingerprint."
          : "Review marked STALE.",
      };
    }
    if (existing.status === "REVIEWED") {
      return {
        eligibility: "REVIEWED",
        effectiveEndAt,
        campaignDateKey,
        scheduledFingerprint: fingerprint,
        scheduleChanged: false,
        timeGatePassed: true,
        reason: "Operator completed review.",
      };
    }
    if (existing.status === "DRAFT") {
      return {
        eligibility: "DRAFT",
        effectiveEndAt,
        campaignDateKey,
        scheduledFingerprint: fingerprint,
        scheduleChanged: false,
        timeGatePassed: true,
        reason: "Draft outcome exists; not yet completed.",
      };
    }
  }

  // Cancelled / postponed may be reviewed immediately (disposition needed).
  if (isCancelledOrPostponedStatus(schedule.status)) {
    return {
      eligibility: "REVIEW_DUE",
      effectiveEndAt,
      campaignDateKey,
      scheduledFingerprint: fingerprint,
      scheduleChanged: false,
      timeGatePassed: true,
      reason: "Cancelled or postponed Events are reviewable for disposition.",
    };
  }

  const timeGatePassed = hasScheduledEndPassed(schedule, now);
  if (!timeGatePassed) {
    return {
      eligibility: "NOT_YET_DUE",
      effectiveEndAt,
      campaignDateKey,
      scheduledFingerprint: fingerprint,
      scheduleChanged: false,
      timeGatePassed: false,
      reason:
        "Scheduled end has not passed. Start time alone never makes an Event review due.",
    };
  }

  return {
    eligibility: "REVIEW_DUE",
    effectiveEndAt,
    campaignDateKey,
    scheduledFingerprint: fingerprint,
    scheduleChanged: false,
    timeGatePassed: true,
    reason:
      "Scheduled end passed. Event is eligible for review — not auto-completed or marked not attended.",
  };
}

/** Indicator label for calendar surfaces (never mutates Event). */
export function outcomeIndicatorLabel(
  eligibility: EligibilityResult["eligibility"],
  followUpNeeded?: boolean,
): string | null {
  if (followUpNeeded && (eligibility === "REVIEWED" || eligibility === "DRAFT")) {
    return "Follow-up needed";
  }
  switch (eligibility) {
    case "REVIEW_DUE":
      return "Review due";
    case "DRAFT":
      return "Hot wash draft";
    case "REVIEWED":
      return "Reviewed";
    case "STALE":
      return "Outcome stale";
    default:
      return null;
  }
}
