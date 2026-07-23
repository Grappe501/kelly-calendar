/**
 * IC-02A — schedule fingerprint + effective end (campaign-local).
 * Pure; no database access.
 */

import { createHash } from "node:crypto";
import { dateKeyInTimeZone } from "@/lib/calendar/temporal/wall-time";
import { CAMPAIGN_TIMEZONE } from "@/lib/calendar/temporal/types";
import type { ScheduleSnapshotInput } from "@/lib/calendar/event-outcomes/types";

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Stable fingerprint of schedule fields that affect review staleness. */
export function buildScheduledFingerprint(input: ScheduleSnapshotInput): string {
  const startsAt = asDate(input.startsAt).toISOString();
  const endsAt = asDate(input.endsAt).toISOString();
  const tz = (input.timezone || CAMPAIGN_TIMEZONE).trim();
  const allDay = input.isAllDay ? "1" : "0";
  const status = (input.status ?? "").trim().toUpperCase();
  const raw = [startsAt, endsAt, tz, allDay, status].join("|");
  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 32);
}

/**
 * Effective review end instant:
 * - timed: Event.endsAt
 * - all-day: exclusive end already stored as midnight after last inclusive day → use endsAt
 * Cross-midnight timed Events correctly use endsAt (may be next calendar day).
 */
export function effectiveReviewEndAt(input: ScheduleSnapshotInput): Date {
  return asDate(input.endsAt);
}

export function primaryCampaignDateKey(input: ScheduleSnapshotInput): string {
  const tz = (input.timezone || CAMPAIGN_TIMEZONE).trim();
  return dateKeyInTimeZone(asDate(input.startsAt), tz);
}

/** Campaign-local "now has passed effective end". */
export function hasScheduledEndPassed(
  input: ScheduleSnapshotInput,
  now: Date,
): boolean {
  return now.getTime() >= effectiveReviewEndAt(input).getTime();
}

export function isCancelledOrPostponedStatus(status?: string | null): boolean {
  const s = (status ?? "").trim().toUpperCase();
  return s === "CANCELLED" || s === "POSTPONED" || s === "DECLINED";
}

export function isArchivedStatus(status?: string | null): boolean {
  return (status ?? "").trim().toUpperCase() === "ARCHIVED";
}
