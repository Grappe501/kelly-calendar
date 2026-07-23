import {
  chicagoTodayKey,
  shiftChicagoDateKey,
} from "@/lib/calendar/chicago-date";

export const MAX_FEED_EVENTS = 2000;
export const MAX_PAST_DAYS = 366;
export const MAX_FUTURE_DAYS = 732;
export const MAX_ONE_TIME_RANGE_DAYS = 400;

export type FeedWindowInput = {
  dateFrom: string;
  dateTo: string;
  now?: Date;
};

export type ClampedFeedWindow = {
  dateFrom: string;
  dateTo: string;
  truncated: boolean;
  reason?: string;
};

function assertDateKey(value: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
}

function daysBetweenInclusive(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.floor((b - a) / 86_400_000) + 1;
}

/**
 * Clamp a feed date window to max past/future horizons and max span.
 * `dateFrom` / `dateTo` are inclusive Chicago calendar dates.
 */
export function clampFeedWindow(input: FeedWindowInput): ClampedFeedWindow {
  assertDateKey(input.dateFrom, "dateFrom");
  assertDateKey(input.dateTo, "dateTo");

  const today = chicagoTodayKey(input.now ?? new Date());
  const minAllowed = shiftChicagoDateKey(today, -MAX_PAST_DAYS);
  const maxAllowed = shiftChicagoDateKey(today, MAX_FUTURE_DAYS);

  let dateFrom = input.dateFrom;
  let dateTo = input.dateTo;
  let truncated = false;
  let reason: string | undefined;

  if (dateFrom > dateTo) {
    dateFrom = dateTo;
    truncated = true;
    reason = "swapped_inverted_range";
  }

  if (dateFrom < minAllowed) {
    dateFrom = minAllowed;
    truncated = true;
    reason = "clamped_past_horizon";
  }
  if (dateTo > maxAllowed) {
    dateTo = maxAllowed;
    truncated = true;
    reason = "clamped_future_horizon";
  }

  if (dateFrom > dateTo) {
    dateFrom = today;
    dateTo = today;
    truncated = true;
    reason = "empty_after_horizon_clamp";
  }

  const span = daysBetweenInclusive(dateFrom, dateTo);
  const maxSpan = Math.min(
    MAX_ONE_TIME_RANGE_DAYS,
    MAX_PAST_DAYS + MAX_FUTURE_DAYS + 1,
  );
  if (span > maxSpan) {
    dateTo = shiftChicagoDateKey(dateFrom, maxSpan - 1);
    if (dateTo > maxAllowed) {
      dateTo = maxAllowed;
      dateFrom = shiftChicagoDateKey(dateTo, -(maxSpan - 1));
      if (dateFrom < minAllowed) dateFrom = minAllowed;
    }
    truncated = true;
    reason = "clamped_max_span";
  }

  return { dateFrom, dateTo, truncated, reason };
}

export function feedRateLimitKey(tokenPrefix: string): string {
  return `ics:feed:${tokenPrefix}`;
}

export function exportRateLimitKey(actorId: string): string {
  return `ics:export:${actorId}`;
}

export function subscriptionLookupRateLimitKey(tokenPrefix: string): string {
  return `ics:sub-lookup:${tokenPrefix}`;
}

export function maxEventsCap(requested?: number): number {
  if (requested == null || !Number.isFinite(requested)) return MAX_FEED_EVENTS;
  return Math.max(0, Math.min(MAX_FEED_EVENTS, Math.floor(requested)));
}
