/**
 * Stable occurrence identity — series + original local scheduled start.
 * Moving an occurrence must not change this key.
 */

import { createHash } from "node:crypto";

export function buildOccurrenceKey(input: {
  seriesId: string;
  /** Local wall: YYYY-MM-DDTHH:mm or YYYY-MM-DD for all-day */
  originalLocalStart: string;
  timezone: string;
  isAllDay: boolean;
}): string {
  const payload = [
    input.seriesId,
    input.originalLocalStart,
    input.timezone,
    input.isAllDay ? "allday" : "timed",
  ].join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export function buildRuleFingerprint(input: {
  rruleNormalized: string;
  dtstartLocal: string;
  timezone: string;
  isAllDay: boolean;
  durationMinutes: number;
}): string {
  const payload = [
    input.rruleNormalized,
    input.dtstartLocal,
    input.timezone,
    input.isAllDay ? "1" : "0",
    String(input.durationMinutes),
  ].join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}
