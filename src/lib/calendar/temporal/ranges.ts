/**
 * Timed / all-day range validation and occupied-day membership.
 */

import {
  chicagoDateKey,
  chicagoDateKeyToUtcBounds,
  shiftChicagoDateKey,
} from "@/lib/calendar/chicago-date";
import {
  dateKeyInTimeZone,
  resolveWallTime,
} from "@/lib/calendar/temporal/wall-time";
import {
  CAMPAIGN_TIMEZONE,
  type AllDayRangeInput,
  type DayMembershipKind,
  type TimedRangeInput,
} from "@/lib/calendar/temporal/types";

export type NormalizedTimedRange = {
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  isAllDay: false;
  isMultiDay: boolean;
  isOvernight: boolean;
  primaryCampaignDateKey: string;
  occupiedCampaignDateKeys: string[];
  ambiguousStart: boolean;
  ambiguousEnd: boolean;
};

export type NormalizedAllDayRange = {
  startsAt: Date;
  endsAt: Date; // exclusive midnight of day after last inclusive day
  timezone: string;
  isAllDay: true;
  isMultiDay: boolean;
  isOvernight: false;
  primaryCampaignDateKey: string;
  occupiedCampaignDateKeys: string[];
  endDateKeyExclusive: string;
};

export function normalizeTimedRange(
  input: TimedRangeInput,
):
  | { ok: true; value: NormalizedTimedRange }
  | { ok: false; message: string } {
  const start = resolveWallTime({
    dateKey: input.startDateKey,
    time: input.startTime,
    timeZone: input.timezone,
    disambiguation: input.disambiguation,
  });
  if (!start.ok) return { ok: false, message: `Start: ${start.message}` };

  const end = resolveWallTime({
    dateKey: input.endDateKey,
    time: input.endTime,
    timeZone: input.timezone,
    disambiguation: input.disambiguation,
  });
  if (!end.ok) return { ok: false, message: `End: ${end.message}` };

  if (end.instant.getTime() <= start.instant.getTime()) {
    return {
      ok: false,
      message:
        "End must be after start. For overnight Events, set the end date to the next day.",
    };
  }

  const occupied = occupiedCampaignDateKeysForInterval(
    start.instant,
    end.instant,
    false,
  );
  const primary = chicagoDateKey(start.instant);
  const isMultiDay = occupied.length > 1;

  return {
    ok: true,
    value: {
      startsAt: start.instant,
      endsAt: end.instant,
      timezone: input.timezone || CAMPAIGN_TIMEZONE,
      isAllDay: false,
      isMultiDay,
      isOvernight: isMultiDay || input.startDateKey !== input.endDateKey,
      primaryCampaignDateKey: primary,
      occupiedCampaignDateKeys: occupied,
      ambiguousStart: start.ambiguous === true,
      ambiguousEnd: end.ambiguous === true,
    },
  };
}

/**
 * All-day: inclusive start/end dates → stored as [start midnight, exclusive end midnight)
 * in campaign timezone (default America/Chicago).
 */
export function normalizeAllDayRange(
  input: AllDayRangeInput,
):
  | { ok: true; value: NormalizedAllDayRange }
  | { ok: false; message: string } {
  if (input.endDateKeyInclusive < input.startDateKey) {
    return {
      ok: false,
      message: "All-day end date must be on or after the start date.",
    };
  }
  const timezone = input.timezone?.trim() || CAMPAIGN_TIMEZONE;
  const endExclusiveKey = shiftChicagoDateKey(input.endDateKeyInclusive, 1);
  const startBounds = chicagoDateKeyToUtcBounds(input.startDateKey);
  const endBounds = chicagoDateKeyToUtcBounds(endExclusiveKey);
  const occupied: string[] = [];
  let cursor = input.startDateKey;
  while (cursor <= input.endDateKeyInclusive) {
    occupied.push(cursor);
    cursor = shiftChicagoDateKey(cursor, 1);
  }
  return {
    ok: true,
    value: {
      startsAt: startBounds.start,
      endsAt: endBounds.start, // exclusive
      timezone,
      isAllDay: true,
      isMultiDay: occupied.length > 1,
      isOvernight: false,
      primaryCampaignDateKey: input.startDateKey,
      occupiedCampaignDateKeys: occupied,
      endDateKeyExclusive: endExclusiveKey,
    },
  };
}

/**
 * Half-open interval intersection with a campaign-local day [dayStart, dayEnd).
 * Timed: startsAt < dayEnd && endsAt > dayStart
 * All-day exclusive end: endsAt === dayStart means not on that day.
 */
export function eventIntersectsCampaignDay(input: {
  startsAt: Date | string;
  endsAt: Date | string;
  isAllDay?: boolean;
  dateKey: string;
}): boolean {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  const { start: dayStart, endExclusive: dayEnd } = chicagoDateKeyToUtcBounds(
    input.dateKey,
  );
  return startsAt.getTime() < dayEnd.getTime() && endsAt.getTime() > dayStart.getTime();
}

export function occupiedCampaignDateKeysForInterval(
  startsAt: Date | string,
  endsAt: Date | string,
  isAllDay = false,
  maxDays = 62,
): string[] {
  void isAllDay;
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (!(start.getTime() < end.getTime())) return [];

  const keys: string[] = [];
  let cursor = chicagoDateKey(start);
  const lastOccupied = (() => {
    // If ends exactly at midnight, last occupied is previous day.
    const endKey = chicagoDateKey(end);
    const { start: midnight } = chicagoDateKeyToUtcBounds(endKey);
    if (end.getTime() === midnight.getTime()) {
      return shiftChicagoDateKey(endKey, -1);
    }
    return endKey;
  })();

  let guard = 0;
  while (cursor <= lastOccupied && guard < maxDays) {
    if (eventIntersectsCampaignDay({ startsAt: start, endsAt: end, dateKey: cursor })) {
      keys.push(cursor);
    }
    cursor = shiftChicagoDateKey(cursor, 1);
    guard += 1;
  }
  return keys;
}

export function dayMembershipKind(input: {
  startsAt: Date | string;
  endsAt: Date | string;
  isAllDay?: boolean;
  dateKey: string;
}): DayMembershipKind | null {
  if (!eventIntersectsCampaignDay(input)) return null;
  if (input.isAllDay) return "all_day";
  const startKey = chicagoDateKey(input.startsAt);
  const occupied = occupiedCampaignDateKeysForInterval(
    input.startsAt,
    input.endsAt,
    false,
  );
  const endsToday =
    occupied.length > 0 && occupied[occupied.length - 1] === input.dateKey;
  const startsToday = startKey === input.dateKey;
  if (startsToday && endsToday) return "starts";
  if (startsToday) return "starts";
  if (endsToday) return "ends";
  return "continues";
}

export function classifyEventTemporal(input: {
  startsAt: Date | string;
  endsAt: Date | string;
  timezone?: string | null;
  isAllDay?: boolean;
}): {
  classification: import("@/lib/calendar/temporal/types").TemporalClassification;
  occupiedCampaignDateKeys: string[];
} {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { classification: "INVALID_RANGE", occupiedCampaignDateKeys: [] };
  }
  if (!(endsAt.getTime() > startsAt.getTime())) {
    return { classification: "INVALID_RANGE", occupiedCampaignDateKeys: [] };
  }
  if (!input.timezone?.trim()) {
    return {
      classification: "MISSING_TIMEZONE",
      occupiedCampaignDateKeys: occupiedCampaignDateKeysForInterval(
        startsAt,
        endsAt,
        Boolean(input.isAllDay),
      ),
    };
  }
  const occupied = occupiedCampaignDateKeysForInterval(
    startsAt,
    endsAt,
    Boolean(input.isAllDay),
  );
  if (input.isAllDay) {
    return {
      classification: occupied.length > 1 ? "VALID_MULTI_DAY" : "VALID_ALL_DAY",
      occupiedCampaignDateKeys: occupied,
    };
  }
  if (occupied.length > 1) {
    return {
      classification:
        occupied.length === 2 ? "VALID_OVERNIGHT" : "VALID_MULTI_DAY",
      occupiedCampaignDateKeys: occupied,
    };
  }
  return { classification: "VALID_TIMED", occupiedCampaignDateKeys: occupied };
}

export function elapsedDurationMinutes(startsAt: Date, endsAt: Date): number {
  return Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
}

export { dateKeyInTimeZone };
