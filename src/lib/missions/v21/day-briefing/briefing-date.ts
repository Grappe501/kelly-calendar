import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";
import type { CampaignDayBriefingConfig } from "@/lib/missions/v21/day-briefing/briefing-config";
import { DEFAULT_DAY_BRIEFING_CONFIG } from "@/lib/missions/v21/day-briefing/briefing-config";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type BriefingDateParseResult =
  | { ok: true; dateKey: string }
  | { ok: false; error: string };

/**
 * Offset of `timeZone` at `date`: local-as-UTC millis minus actual UTC millis.
 */
function timezoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/** Convert a campaign-local civil datetime to a UTC Date. */
export function campaignLocalDateTimeToUtc(
  dateKey: string,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, hour, minute, second);
  let utc = utcGuess - timezoneOffsetMs(new Date(utcGuess), timeZone);
  utc = utcGuess - timezoneOffsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

export function campaignDayBounds(
  dateKey: string,
  timeZone: string,
): { start: Date; end: Date } {
  const start = campaignLocalDateTimeToUtc(dateKey, 0, 0, 0, timeZone);
  const end = campaignLocalDateTimeToUtc(dateKey, 23, 59, 59, timeZone);
  return { start, end: new Date(end.getTime() + 999) };
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function parseBriefingDateKey(raw: string): BriefingDateParseResult {
  if (!DATE_RE.test(raw)) {
    return {
      ok: false,
      error: `Invalid date format "${raw}". Use YYYY-MM-DD.`,
    };
  }
  const [y, m, d] = raw.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return { ok: false, error: `Invalid calendar date "${raw}".` };
  }
  return { ok: true, dateKey: raw };
}

export function assertBriefingDateInRange(
  dateKey: string,
  now: Date,
  timeZone: string,
  config: CampaignDayBriefingConfig = DEFAULT_DAY_BRIEFING_CONFIG,
): BriefingDateParseResult {
  const parsed = parseBriefingDateKey(dateKey);
  if (!parsed.ok) return parsed;
  const today = campaignDateKey(now, timeZone);
  const earliest = addDaysToDateKey(today, -config.allowedPastDays);
  const latest = addDaysToDateKey(today, config.allowedFutureDays);
  if (dateKey < earliest) {
    return {
      ok: false,
      error: `Date ${dateKey} is outside the allowed past range (earliest ${earliest}).`,
    };
  }
  if (dateKey > latest) {
    return {
      ok: false,
      error: `Date ${dateKey} is outside the allowed future range (latest ${latest}).`,
    };
  }
  return parsed;
}

export function classifyBriefingDay(
  dateKey: string,
  now: Date,
  timeZone: string,
): { isToday: boolean; isPast: boolean; isFuture: boolean } {
  const today = campaignDateKey(now, timeZone);
  return {
    isToday: dateKey === today,
    isPast: dateKey < today,
    isFuture: dateKey > today,
  };
}

export function formatCampaignTime(
  iso: string,
  timeZone: string,
  options?: { includeDate?: boolean },
): string {
  const d = new Date(iso);
  if (options?.includeDate) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatFullCampaignDate(dateKey: string, timeZone: string): string {
  const noon = campaignLocalDateTimeToUtc(dateKey, 12, 0, 0, timeZone);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(noon);
}

/** Mission intersects campaign-local day if start or end falls on dateKey. */
export function missionIntersectsCampaignDay(
  startsAt: string,
  endsAt: string,
  dateKey: string,
  timeZone: string,
): boolean {
  const startKey = campaignDateKey(startsAt, timeZone);
  const endKey = campaignDateKey(endsAt, timeZone);
  return startKey <= dateKey && endKey >= dateKey;
}
