/**
 * CC-08 Scheduling Layout Engine — wall-clock time scale math (pure).
 * Build: KCCC-CC-08-SCHEDULING-LAYOUT-ENGINE-1.0
 *
 * Converts instants to minutes-from-local-midnight and projects a
 * [startMin, endMin) interval onto a visible-hours window as top/height
 * percentages. Uses `Intl.DateTimeFormat` only — no extra date library.
 */

const DEFAULT_TIME_ZONE = "America/Chicago";

/**
 * Minutes elapsed since local midnight (in `timeZone`) for `date`.
 * Result is in [0, 1440). Includes fractional seconds precision.
 */
export function minutesFromMidnight(
  date: Date | string,
  timeZone: string = DEFAULT_TIME_ZONE,
): number {
  const instant = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const hourRaw = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const second = Number(parts.find((p) => p.type === "second")?.value ?? "0");
  // Some locales render midnight as "24" with hour12:false; normalize to 0.
  const hour = hourRaw === 24 ? 0 : hourRaw;

  return hour * 60 + minute + second / 60;
}

export type VisibleRangeResult = {
  /** Percent [0-100] from the top of the visible window. */
  topPct: number;
  /** Percent [0-100] height within the visible window. */
  heightPct: number;
  /** True when the real start is earlier than the visible window start. */
  clippedStart: boolean;
  /** True when the real end is later than the visible window end. */
  clippedEnd: boolean;
  /** True when [startMin, endMin) has zero overlap with the visible window. */
  outside: boolean;
};

/**
 * Project a half-open [startMin, endMin) minute interval onto a
 * [visibleStartHour, visibleEndHour) visible window, returning percentage
 * geometry for rendering plus clip/outside flags.
 */
export function clampVisibleRange(
  startMin: number,
  endMin: number,
  visibleStartHour: number,
  visibleEndHour: number,
): VisibleRangeResult {
  const visibleStartMin = visibleStartHour * 60;
  const visibleEndMin = visibleEndHour * 60;
  const totalVisibleMin = Math.max(1, visibleEndMin - visibleStartMin);

  // Half-open overlap test: no overlap if the interval ends at/before the
  // window starts, or starts at/after the window ends.
  if (endMin <= visibleStartMin || startMin >= visibleEndMin) {
    return { topPct: 0, heightPct: 0, clippedStart: false, clippedEnd: false, outside: true };
  }

  const clippedStart = startMin < visibleStartMin;
  const clippedEnd = endMin > visibleEndMin;

  const clampedStartMin = Math.max(startMin, visibleStartMin);
  const clampedEndMin = Math.min(endMin, visibleEndMin);

  const topPct = ((clampedStartMin - visibleStartMin) / totalVisibleMin) * 100;
  const heightPct = Math.max(0, ((clampedEndMin - clampedStartMin) / totalVisibleMin) * 100);

  return { topPct, heightPct, clippedStart, clippedEnd, outside: false };
}

/**
 * Percent [0-100] top offset of a single point in time within the visible
 * window, or `null` when the point falls outside the window entirely.
 * Used for "now" indicator lines.
 */
export function pointTopPct(
  min: number,
  visibleStartHour: number,
  visibleEndHour: number,
): number | null {
  const visibleStartMin = visibleStartHour * 60;
  const visibleEndMin = visibleEndHour * 60;
  if (min < visibleStartMin || min > visibleEndMin) return null;
  const totalVisibleMin = Math.max(1, visibleEndMin - visibleStartMin);
  return ((min - visibleStartMin) / totalVisibleMin) * 100;
}

/**
 * Whole-hour labels to render as gridlines/row headers, inclusive of both
 * `visibleStartHour` and `visibleEndHour` (e.g. 6..22).
 */
export function hourLabels(visibleStartHour: number, visibleEndHour: number): number[] {
  const start = Math.max(0, Math.min(23, Math.trunc(visibleStartHour)));
  const end = Math.max(start + 1, Math.min(24, Math.trunc(visibleEndHour)));
  const labels: number[] = [];
  for (let hour = start; hour <= end; hour += 1) {
    labels.push(hour);
  }
  return labels;
}
