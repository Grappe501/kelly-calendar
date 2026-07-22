/**
 * CC-08 Scheduling Layout Engine — single-day layout (pure).
 * Build: KCCC-CC-08-SCHEDULING-LAYOUT-ENGINE-1.0
 *
 * Turns a flat list of `GridEventInput` into a fully-positioned
 * `DayLayoutResult` for one Chicago calendar date. Never mutates its
 * inputs, never persists anything, never reaches into React/Prisma.
 */

import {
  chicagoDateKeyToUtcBounds,
  chicagoTodayKey,
  shiftChicagoDateKey,
} from "@/lib/calendar/chicago-date";
import {
  dayMembershipKind,
  occupiedCampaignDateKeysForInterval,
} from "@/lib/calendar/temporal";
import { canonicalizeLayoutPreferences } from "@/lib/calendar/scheduling/preferences";
import { packTimedLanes } from "@/lib/calendar/scheduling/pack-lanes";
import {
  clampVisibleRange,
  hourLabels,
  minutesFromMidnight,
  pointTopPct,
} from "@/lib/calendar/scheduling/time-scale";
import type {
  AllDayLayoutItem,
  ContinuityKind,
  DayLayoutResult,
  GridEventInput,
  LayoutPreferences,
  TimedLayoutItem,
} from "@/lib/calendar/scheduling/types";

const DEFAULT_TIME_ZONE = "America/Chicago";

/** Number of all-day rows shown before collapsing into "+N more" overflow. */
export const ALL_DAY_COLLAPSED_VISIBLE_COUNT = 3;

export type LayoutCampaignDayInput = {
  dateKey: string;
  events: readonly GridEventInput[];
  preferences?: Partial<LayoutPreferences> | null;
  timeZone?: string;
  now?: Date;
};

function toDateOrNull(value: Date | string): Date | null {
  const instant = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(instant.getTime()) ? null : instant;
}

function buildAllDayAriaLabel(event: GridEventInput, isMultiDay: boolean): string {
  const parts = [event.title];
  if (isMultiDay) parts.push("(multi-day)");
  if (event.locationLabel) parts.push(`— ${event.locationLabel}`);
  return parts.join(" ");
}

function buildTimedAriaLabel(event: GridEventInput, continuity: ContinuityKind): string {
  const parts = [event.title];
  if (continuity === "starts") parts.push("(continues tomorrow)");
  else if (continuity === "ends") parts.push("(continued from yesterday)");
  else if (continuity === "continues") parts.push("(continues)");
  if (event.locationLabel) parts.push(`— ${event.locationLabel}`);
  if (event.conflictSeverity) parts.push(`— conflict: ${event.conflictSeverity}`);
  return parts.join(" ");
}

/**
 * Clip an instant range to a day's [dayStart, dayEnd) UTC bounds.
 */
function clipToDayBounds(
  startsAt: Date,
  endsAt: Date,
  dayStart: Date,
  dayEnd: Date,
): { start: Date; end: Date } {
  const start = startsAt.getTime() < dayStart.getTime() ? dayStart : startsAt;
  const end = endsAt.getTime() > dayEnd.getTime() ? dayEnd : endsAt;
  return { start, end };
}

/**
 * Minutes-from-midnight for an instant that has already been clipped to a
 * day's bounds. An instant exactly at `dayEnd` (midnight starting the next
 * day) represents "24:00" of *this* day, not "00:00" of the next.
 */
function minutesForClippedInstant(instant: Date, dayEnd: Date, timeZone: string): number {
  if (instant.getTime() === dayEnd.getTime()) return 24 * 60;
  return minutesFromMidnight(instant, timeZone);
}

/**
 * Lay out one Chicago calendar day: all-day pills plus a lane-packed,
 * visible-hours-clamped timed grid. Pure function — same inputs always
 * produce a structurally identical result.
 */
export function layoutCampaignDay(input: LayoutCampaignDayInput): DayLayoutResult {
  const { dateKey } = input;
  const timeZone = input.timeZone?.trim() || DEFAULT_TIME_ZONE;
  const preferences = canonicalizeLayoutPreferences(input.preferences);
  const { start: dayStart, endExclusive: dayEnd } = chicagoDateKeyToUtcBounds(dateKey);

  const allDay: AllDayLayoutItem[] = [];
  type TimedCandidate = {
    event: GridEventInput;
    startsAt: Date;
    endsAt: Date;
    continuity: ContinuityKind;
  };
  const timedCandidates: TimedCandidate[] = [];

  for (const event of input.events) {
    const startsAt = toDateOrNull(event.startsAt);
    const endsAt = toDateOrNull(event.endsAt);
    if (!startsAt || !endsAt || !(endsAt.getTime() > startsAt.getTime())) continue;

    const membership = dayMembershipKind({
      startsAt,
      endsAt,
      isAllDay: event.isAllDay,
      dateKey,
    });
    if (membership === null) continue; // does not occupy this Chicago day

    if (event.isAllDay) {
      const occupied = occupiedCampaignDateKeysForInterval(startsAt, endsAt, true);
      const spanStartDateKey = occupied[0] ?? dateKey;
      const spanEndExclusiveDateKey = shiftChicagoDateKey(
        occupied[occupied.length - 1] ?? dateKey,
        1,
      );
      allDay.push({
        id: event.id,
        dateKey,
        spanStartDateKey,
        spanEndExclusiveDateKey,
        columnStart: 0,
        columnSpan: 1,
        title: event.title,
        href: event.href,
        // dayMembershipKind always reports "all_day" for all-day events —
        // day view chunks a multi-day all-day event into one pill per day.
        continuity: "all_day",
        ariaLabel: buildAllDayAriaLabel(event, occupied.length > 1),
      });
      continue;
    }

    const occupied = occupiedCampaignDateKeysForInterval(startsAt, endsAt, false);
    const continuity: ContinuityKind = occupied.length <= 1 ? "within" : (membership as ContinuityKind);
    timedCandidates.push({ event, startsAt, endsAt, continuity });
  }

  const clippedCandidates = timedCandidates.map((candidate) => {
    const { start, end } = clipToDayBounds(candidate.startsAt, candidate.endsAt, dayStart, dayEnd);
    return { ...candidate, clippedStart: start, clippedEnd: end };
  });

  const laneAssignments = packTimedLanes(
    clippedCandidates.map((c) => ({
      id: c.event.id,
      startMs: c.clippedStart.getTime(),
      endMs: c.clippedEnd.getTime(),
    })),
  );

  const timed: TimedLayoutItem[] = clippedCandidates.map((candidate) => {
    const { event, startsAt, endsAt, clippedStart, clippedEnd, continuity } = candidate;

    const dayClippedStart = startsAt.getTime() < dayStart.getTime();
    const dayClippedEnd = endsAt.getTime() > dayEnd.getTime();

    const startMin = minutesForClippedInstant(clippedStart, dayEnd, timeZone);
    const endMin = minutesForClippedInstant(clippedEnd, dayEnd, timeZone);

    const range = clampVisibleRange(
      startMin,
      endMin,
      preferences.visibleStartHour,
      preferences.visibleEndHour,
    );

    const lane = laneAssignments.get(event.id) ?? { lane: 0, laneCount: 1 };

    return {
      id: event.id,
      dateKey,
      title: event.title,
      href: event.href,
      topPct: range.outside ? 0 : range.topPct,
      heightPct: range.outside ? 0 : range.heightPct,
      lane: lane.lane,
      laneCount: lane.laneCount,
      clippedStart: dayClippedStart || range.clippedStart,
      clippedEnd: dayClippedEnd || range.clippedEnd,
      continuity,
      conflictSeverity: event.conflictSeverity ?? null,
      conflictCount: event.conflictCount,
      availabilityClass: event.availabilityClass ?? null,
      status: event.status,
      calendarName: event.calendarName,
      locationLabel: event.locationLabel ?? null,
      missionLinked: event.missionLinked,
      isImported: event.isImported,
      isRecurring: event.isRecurring,
      ariaLabel: buildTimedAriaLabel(event, continuity),
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt.toISOString(),
      outsideVisibleHours: range.outside,
    };
  });

  timed.sort((a, b) => {
    if (a.startsAtIso !== b.startsAtIso) return a.startsAtIso < b.startsAtIso ? -1 : 1;
    if (a.lane !== b.lane) return a.lane - b.lane;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  allDay.sort((a, b) => {
    if (a.spanStartDateKey !== b.spanStartDateKey) {
      return a.spanStartDateKey < b.spanStartDateKey ? -1 : 1;
    }
    if (a.title !== b.title) return a.title < b.title ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  if (!preferences.allDayExpanded) {
    allDay.forEach((item, index) => {
      if (index >= ALL_DAY_COLLAPSED_VISIBLE_COUNT) {
        item.overflowIndex = index - ALL_DAY_COLLAPSED_VISIBLE_COUNT;
      }
    });
  }

  const outsideHoursIds = timed.filter((t) => t.outsideVisibleHours).map((t) => t.id);

  const now = input.now ?? new Date();
  let currentTimeTopPct: number | null = null;
  if (dateKey === chicagoTodayKey(now)) {
    const nowMin = minutesFromMidnight(now, timeZone);
    currentTimeTopPct = pointTopPct(nowMin, preferences.visibleStartHour, preferences.visibleEndHour);
  }

  return {
    dateKey,
    allDay,
    timed,
    outsideHoursIds,
    hourLabels: hourLabels(preferences.visibleStartHour, preferences.visibleEndHour),
    currentTimeTopPct,
  };
}
