import type { ScheduleWindowInput } from "@/lib/missions/v21/communications/campaigns/campaign-types";

const KNOWN_TIMEZONES = new Set([
  "UTC",
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
]);

export function isRecognizedTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  if (KNOWN_TIMEZONES.has(tz)) return true;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** HH:MM local window validation */
export function isValidDailyWindow(
  start: string | null | undefined,
  end: string | null | undefined,
): boolean {
  if (!start && !end) return true;
  if (!start || !end) return false;
  const re = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!re.test(start) || !re.test(end)) return false;
  return start < end;
}

/**
 * Fail closed on ambiguous/nonexistent local times by requiring ISO/UTC
 * stored instants and a recognized IANA zone — do not invent DST folds.
 */
export function validateScheduleWindow(input: ScheduleWindowInput): {
  ok: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecognizedTimezone(input.timezone)) {
    errors.push("INVALID_TIMEZONE");
  }
  const start = asDate(input.scheduledStartAt);
  const end = asDate(input.scheduledEndAt);
  if (start && end && start.getTime() >= end.getTime()) {
    errors.push("START_MUST_PRECEDE_END");
  }
  if (!isValidDailyWindow(input.dailyWindowStart, input.dailyWindowEnd)) {
    errors.push("INVALID_DAILY_WINDOW");
  }
  const now = input.now ?? new Date();
  if (end && end.getTime() < now.getTime()) {
    errors.push("SCHEDULE_WINDOW_EXPIRED");
  }
  if (start && start.getTime() < now.getTime() - 60_000) {
    warnings.push("START_IN_PAST_REQUIRES_OPERATOR_CORRECTION");
  }
  if (input.blackouts) {
    for (const b of input.blackouts) {
      const bs = asDate(b.startsAt);
      const be = asDate(b.endsAt);
      if (!bs || !be || bs >= be) errors.push("INVALID_BLACKOUT");
      else if (now >= bs && now <= be) errors.push("WITHIN_BLACKOUT");
    }
  }
  if (input.allowedWeekdays) {
    for (const d of input.allowedWeekdays) {
      if (!Number.isInteger(d) || d < 0 || d > 6) {
        errors.push("INVALID_WEEKDAY");
        break;
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function isWithinAuthorizedWindow(input: {
  now?: Date;
  authorizedStartAt: Date | string | null;
  authorizedEndAt: Date | string | null;
}): boolean {
  const now = input.now ?? new Date();
  const start = asDate(input.authorizedStartAt);
  const end = asDate(input.authorizedEndAt);
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}
