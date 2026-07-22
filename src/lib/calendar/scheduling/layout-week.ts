/**
 * CC-08 Scheduling Layout Engine — week layout (pure).
 * Build: KCCC-CC-08-SCHEDULING-LAYOUT-ENGINE-1.0
 *
 * Composes per-day layouts (`layoutCampaignDay`) across a sequence of
 * Chicago date keys and computes multi-day all-day spanning rows across
 * those columns. Never mutates its inputs, never persists anything.
 */

import { chicagoTodayKey, shiftChicagoDateKey, weekDateKeys } from "@/lib/calendar/chicago-date";
import { occupiedCampaignDateKeysForInterval } from "@/lib/calendar/temporal";
import { canonicalizeLayoutPreferences } from "@/lib/calendar/scheduling/preferences";
import { layoutCampaignDay } from "@/lib/calendar/scheduling/layout-day";
import type {
  AllDayLayoutItem,
  ContinuityKind,
  GridEventInput,
  LayoutPreferences,
  WeekLayoutResult,
} from "@/lib/calendar/scheduling/types";

export type LayoutCampaignWeekInput = {
  /** Explicit set of Chicago date keys to render (any order; deduped + sorted). */
  weekDateKeys?: readonly string[];
  /** Alternative to `weekDateKeys`: any date key within the target Monday-start week. */
  anchorDateKey?: string;
  events: readonly GridEventInput[];
  preferences?: Partial<LayoutPreferences> | null;
  timeZone?: string;
  now?: Date;
};

function isWeekdayDateKey(dateKey: string): boolean {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = utcNoon.getUTCDay(); // 0 Sun … 6 Sat
  return day !== 0 && day !== 6;
}

function resolveBaseDateKeys(input: LayoutCampaignWeekInput): string[] {
  if (input.weekDateKeys && input.weekDateKeys.length > 0) {
    return [...new Set(input.weekDateKeys)].sort();
  }
  const anchor = input.anchorDateKey ?? chicagoTodayKey(input.now ?? new Date());
  return weekDateKeys(anchor);
}

function toDateOrNull(value: Date | string): Date | null {
  const instant = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/**
 * Build one spanning row per multi-/single-day all-day event, positioned
 * with `columnStart`/`columnSpan` against the rendered `dateKeys` sequence
 * (which may have gaps, e.g. workweek-only mode).
 */
function buildWeekAllDayRows(
  events: readonly GridEventInput[],
  dateKeys: readonly string[],
): AllDayLayoutItem[] {
  if (dateKeys.length === 0) return [];

  const sortedKeys = [...dateKeys].sort();
  const windowStart = sortedKeys[0];
  const windowEndExclusive = shiftChicagoDateKey(sortedKeys[sortedKeys.length - 1], 1);

  const rows: AllDayLayoutItem[] = [];

  for (const event of events) {
    if (!event.isAllDay) continue;
    const startsAt = toDateOrNull(event.startsAt);
    const endsAt = toDateOrNull(event.endsAt);
    if (!startsAt || !endsAt || !(endsAt.getTime() > startsAt.getTime())) continue;

    const occupied = occupiedCampaignDateKeysForInterval(startsAt, endsAt, true);
    if (occupied.length === 0) continue;

    const spanStartDateKey = occupied[0];
    const spanEndExclusiveDateKey = shiftChicagoDateKey(occupied[occupied.length - 1], 1);

    // Clip the span to the rendered window before locating columns.
    const visibleSpanStart = spanStartDateKey < windowStart ? windowStart : spanStartDateKey;
    const visibleSpanEndExclusive =
      spanEndExclusiveDateKey > windowEndExclusive ? windowEndExclusive : spanEndExclusiveDateKey;
    if (!(visibleSpanStart < visibleSpanEndExclusive)) continue; // no overlap with rendered window

    let columnStart = -1;
    let columnEnd = -1;
    for (let i = 0; i < dateKeys.length; i += 1) {
      const key = dateKeys[i];
      if (key >= visibleSpanStart && key < visibleSpanEndExclusive) {
        if (columnStart === -1) columnStart = i;
        columnEnd = i;
      }
    }
    if (columnStart === -1) continue; // rendered window has a gap covering the whole span (e.g. workweek-only)

    const columnSpan = columnEnd - columnStart + 1;
    const clippedLeft = spanStartDateKey < windowStart;
    const clippedRight = spanEndExclusiveDateKey > windowEndExclusive;

    const continuity: ContinuityKind =
      clippedLeft && clippedRight
        ? "continues"
        : clippedRight
          ? "starts"
          : clippedLeft
            ? "ends"
            : "within";

    const parts = [event.title];
    if (occupied.length > 1) parts.push("(multi-day)");
    if (event.locationLabel) parts.push(`— ${event.locationLabel}`);

    rows.push({
      id: event.id,
      dateKey: dateKeys[columnStart],
      spanStartDateKey,
      spanEndExclusiveDateKey,
      columnStart,
      columnSpan,
      title: event.title,
      href: event.href,
      continuity,
      ariaLabel: parts.join(" "),
    });
  }

  rows.sort((a, b) => {
    if (a.columnStart !== b.columnStart) return a.columnStart - b.columnStart;
    if (a.columnSpan !== b.columnSpan) return b.columnSpan - a.columnSpan;
    if (a.title !== b.title) return a.title < b.title ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return rows;
}

/**
 * Lay out a sequence of Chicago calendar days as a week grid: per-day
 * timed packing (independent per day) plus multi-day all-day spanning
 * rows across the rendered columns.
 *
 * `workweekOnly` filters the rendered columns to Monday–Friday. Per the
 * CC-08 contract, `showWeekends`/`workweekOnly` being false must NOT
 * silently drop weekend columns from a seven-day render — only an
 * explicit `workweekOnly: true` narrows the column set.
 */
export function layoutCampaignWeek(input: LayoutCampaignWeekInput): WeekLayoutResult {
  const preferences = canonicalizeLayoutPreferences(input.preferences);
  const baseKeys = resolveBaseDateKeys(input);

  const renderedKeys = preferences.workweekOnly ? baseKeys.filter(isWeekdayDateKey) : baseKeys;
  const finalKeys = renderedKeys.length > 0 ? renderedKeys : baseKeys;

  const days = finalKeys.map((dateKey) =>
    layoutCampaignDay({
      dateKey,
      events: input.events,
      preferences,
      timeZone: input.timeZone,
      now: input.now,
    }),
  );

  const allDayRows = buildWeekAllDayRows(input.events, finalKeys);

  return { weekDateKeys: finalKeys, days, allDayRows };
}
