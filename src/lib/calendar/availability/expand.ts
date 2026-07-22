import { shiftChicagoDateKey } from "@/lib/calendar/chicago-date";
import {
  chicagoWallTimeToUtc,
  dateKeyInTimeZone,
  normalizeAllDayRange,
  resolveWallTime,
} from "@/lib/calendar/temporal";
import type {
  AvailabilityClassification,
  AvailabilityExceptionSnapshot,
  AvailabilityInterval,
  AvailabilityRuleSnapshot,
} from "@/lib/calendar/availability/types";

const MAX_EXPANSION_DAYS = 120;

function weekdayIso(dateKey: string, timeZone: string): number {
  const instant =
    timeZone === "America/Chicago"
      ? chicagoWallTimeToUtc(dateKey, "12:00")
      : (() => {
          const r = resolveWallTime({
            dateKey,
            time: "12:00",
            timeZone,
          });
          return r.ok ? r.instant : new Date(`${dateKey}T17:00:00.000Z`);
        })();
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(instant);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[wd] ?? 1;
}

function localRangeToUtc(
  dateKey: string,
  startLocal: string,
  endLocal: string,
  timeZone: string,
): { startsAt: Date; endsAt: Date } | null {
  const start = resolveWallTime({
    dateKey,
    time: startLocal,
    timeZone,
  });
  if (!start.ok) return null;
  let end = resolveWallTime({
    dateKey,
    time: endLocal,
    timeZone,
  });
  if (!end.ok) return null;
  if (end.instant <= start.instant) {
    const next = shiftChicagoDateKey(dateKey, 1);
    end = resolveWallTime({
      dateKey: next,
      time: endLocal,
      timeZone,
    });
    if (!end.ok) return null;
  }
  return { startsAt: start.instant, endsAt: end.instant };
}

function expandBuffer(
  interval: { startsAt: Date; endsAt: Date },
  beforeMin: number,
  afterMin: number,
): { startsAt: Date; endsAt: Date } {
  return {
    startsAt: new Date(interval.startsAt.getTime() - beforeMin * 60_000),
    endsAt: new Date(interval.endsAt.getTime() + afterMin * 60_000),
  };
}

function dateKeysInRange(
  rangeStart: Date,
  rangeEnd: Date,
  timeZone: string,
): string[] {
  const startKey = dateKeyInTimeZone(rangeStart, timeZone);
  const endKey = dateKeyInTimeZone(
    new Date(Math.max(rangeStart.getTime(), rangeEnd.getTime() - 1)),
    timeZone,
  );
  const keys: string[] = [];
  let cur = startKey;
  for (let i = 0; i < MAX_EXPANSION_DAYS; i += 1) {
    keys.push(cur);
    if (cur >= endKey) break;
    cur = shiftChicagoDateKey(cur, 1);
  }
  return keys;
}

export function expandRuleIntervals(input: {
  rule: AvailabilityRuleSnapshot;
  rangeStartsAt: Date;
  rangeEndsAt: Date;
}): { intervals: AvailabilityInterval[]; truncated: boolean } {
  const { rule } = input;
  if (!rule.isActive || rule.approvalState !== "ACTIVE") {
    return { intervals: [], truncated: false };
  }
  if (!rule.startLocalTime || !rule.endLocalTime) {
    return { intervals: [], truncated: false };
  }

  const keys = dateKeysInRange(
    input.rangeStartsAt,
    input.rangeEndsAt,
    rule.timezone,
  );
  const truncated = keys.length >= MAX_EXPANSION_DAYS;
  const intervals: AvailabilityInterval[] = [];

  for (const dateKey of keys) {
    if (dateKey < rule.effectiveStartDate) continue;
    if (rule.effectiveEndDate && dateKey >= rule.effectiveEndDate) continue;
    if (rule.weekdays.length > 0) {
      const wd = weekdayIso(dateKey, rule.timezone);
      if (!rule.weekdays.includes(wd)) continue;
    }
    const raw = localRangeToUtc(
      dateKey,
      rule.startLocalTime,
      rule.endLocalTime,
      rule.timezone,
    );
    if (!raw) continue;
    const buffered = expandBuffer(
      raw,
      rule.bufferBeforeMinutes,
      rule.bufferAfterMinutes,
    );
    if (
      buffered.endsAt <= input.rangeStartsAt ||
      buffered.startsAt >= input.rangeEndsAt
    ) {
      continue;
    }
    intervals.push({
      startsAt: buffered.startsAt,
      endsAt: buffered.endsAt,
      classification: rule.classification,
      ruleId: rule.id,
      label: rule.label,
      explanation: `${rule.label} (${rule.classification})`,
      bufferBeforeMinutes: rule.bufferBeforeMinutes,
      bufferAfterMinutes: rule.bufferAfterMinutes,
    });
  }

  return { intervals, truncated };
}

export function expandExceptionIntervals(input: {
  exception: AvailabilityExceptionSnapshot;
  rangeStartsAt: Date;
  rangeEndsAt: Date;
}): AvailabilityInterval[] {
  const ex = input.exception;
  if (!ex.isActive || ex.approvalState !== "ACTIVE") return [];

  const intervals: AvailabilityInterval[] = [];
  let cur = ex.startDate;
  let guard = 0;
  while (cur < ex.endDateExclusive && guard < MAX_EXPANSION_DAYS) {
    guard += 1;
    if (ex.isAllDay || !ex.startLocalTime || !ex.endLocalTime) {
      const day = normalizeAllDayRange({
        startDateKey: cur,
        endDateKeyInclusive: cur,
        timezone: ex.timezone,
      });
      if (
        day.ok &&
        day.value.startsAt < input.rangeEndsAt &&
        day.value.endsAt > input.rangeStartsAt
      ) {
        intervals.push({
          startsAt: day.value.startsAt,
          endsAt: day.value.endsAt,
          classification: ex.classification,
          exceptionId: ex.id,
          ruleId: ex.ruleId ?? undefined,
          label: ex.label,
          explanation: `${ex.label} (exception · ${ex.classification})`,
        });
      }
    } else {
      const raw = localRangeToUtc(
        cur,
        ex.startLocalTime,
        ex.endLocalTime,
        ex.timezone,
      );
      if (
        raw &&
        raw.startsAt < input.rangeEndsAt &&
        raw.endsAt > input.rangeStartsAt
      ) {
        intervals.push({
          startsAt: raw.startsAt,
          endsAt: raw.endsAt,
          classification: ex.classification,
          exceptionId: ex.id,
          ruleId: ex.ruleId ?? undefined,
          label: ex.label,
          explanation: `${ex.label} (exception · ${ex.classification})`,
        });
      }
    }
    cur = shiftChicagoDateKey(cur, 1);
  }
  return intervals;
}

export function intervalsOverlapHalfOpen(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function overlapInterval(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): { startsAt: Date; endsAt: Date } | null {
  if (!intervalsOverlapHalfOpen(aStart, aEnd, bStart, bEnd)) return null;
  return {
    startsAt: aStart > bStart ? aStart : bStart,
    endsAt: aEnd < bEnd ? aEnd : bEnd,
  };
}

export function classifyFromIntervals(
  intervals: AvailabilityInterval[],
): AvailabilityClassification {
  if (intervals.length === 0) return "UNKNOWN";
  const order: AvailabilityClassification[] = [
    "UNAVAILABLE",
    "REQUIRES_REVIEW",
    "CONSTRAINED",
    "PREFERRED",
    "AVAILABLE",
    "UNKNOWN",
  ];
  for (const c of order) {
    if (intervals.some((i) => i.classification === c)) return c;
  }
  return "UNKNOWN";
}
