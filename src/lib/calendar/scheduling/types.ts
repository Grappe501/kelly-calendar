/**
 * CC-08 Scheduling Layout Engine — shared types (pure).
 * Build: KCCC-CC-08-SCHEDULING-LAYOUT-ENGINE-1.0
 *
 * Pure geometry/layout contracts consumed by Day/Week grid rendering.
 * No React, no Prisma, no drag-drop, no persistence, no mutation of
 * Events/Missions/availability/conflict data. Every function that
 * consumes these types must be a pure function of its inputs.
 */

export type SchedulingViewMode = "day" | "week";

export type LayoutDensity = "compact" | "comfortable";

export type LayoutPreferences = {
  /** Local (America/Chicago) hour [0-23] the visible grid begins at. Default 6. */
  visibleStartHour: number;
  /** Local hour [1-24] the visible grid ends at (exclusive-ish boundary). Default 22. */
  visibleEndHour: number;
  density: LayoutDensity;
  showWeekends: boolean;
  allDayExpanded: boolean;
  showAvailability: boolean;
  showConflicts: boolean;
  workweekOnly: boolean;
};

/**
 * Minimal event projection the layout engine needs. Callers (server
 * components / view-model builders) are responsible for producing this
 * from CanonicalEvent + visibility policy; the layout engine never talks
 * to the database and never decides what a viewer is allowed to see.
 */
export type GridEventInput = {
  id: string;
  title: string;
  startsAt: Date | string;
  endsAt: Date | string;
  isAllDay: boolean;
  status?: string;
  calendarName?: string;
  locationLabel?: string | null;
  missionLinked?: boolean;
  isImported?: boolean;
  isRecurring?: boolean;
  conflictSeverity?: string | null;
  conflictCount?: number;
  availabilityClass?: string | null;
  href: string;
};

/**
 * How a rendered segment relates to the event's full occupied range:
 * - "within": the entire event fits inside this rendered window (single-day
 *   timed event, or an all-day span that fits fully inside the visible week
 *   with no clipping on either edge).
 * - "starts": the segment's real start is visible (unclipped left) but the
 *   event continues past the right/bottom edge of this rendered window.
 * - "ends": the segment's real end is visible (unclipped right/bottom) but
 *   the event arrived from before the left/top edge of this window.
 * - "continues": clipped on both edges — a pure middle slice.
 * - "all_day": per-day all-day occurrence marker (day view chunking; see
 *   `dayMembershipKind`, which always reports "all_day" for all-day events).
 */
export type ContinuityKind = "starts" | "ends" | "continues" | "all_day" | "within";

export type TimedLayoutItem = {
  id: string;
  dateKey: string;
  title: string;
  href: string;
  /** Percent [0-100] from the top of the visible-hours grid. */
  topPct: number;
  /** Percent [0-100] height within the visible-hours grid. */
  heightPct: number;
  lane: number;
  laneCount: number;
  clippedStart: boolean;
  clippedEnd: boolean;
  continuity: ContinuityKind;
  conflictSeverity?: string | null;
  conflictCount?: number;
  availabilityClass?: string | null;
  status?: string;
  calendarName?: string;
  locationLabel?: string | null;
  missionLinked?: boolean;
  isImported?: boolean;
  isRecurring?: boolean;
  ariaLabel: string;
  startsAtIso: string;
  endsAtIso: string;
  /** True when the segment has zero overlap with the visible-hours window. */
  outsideVisibleHours: boolean;
};

export type AllDayLayoutItem = {
  id: string;
  dateKey: string;
  /** Inclusive first occupied Chicago date key for the full event. */
  spanStartDateKey: string;
  /** Exclusive day-after-last-occupied Chicago date key for the full event. */
  spanEndExclusiveDateKey: string;
  /** 0-based column index into the rendered date-key sequence. */
  columnStart: number;
  /** Number of rendered columns this row occupies (>= 1). */
  columnSpan: number;
  title: string;
  href: string;
  continuity: ContinuityKind;
  ariaLabel: string;
  /** Set when this row is collapsed into a "+N more" overflow group. */
  overflowIndex?: number;
};

export type DayLayoutResult = {
  dateKey: string;
  allDay: AllDayLayoutItem[];
  timed: TimedLayoutItem[];
  outsideHoursIds: string[];
  hourLabels: number[];
  /** Percent [0-100] top offset of the "now" line, only set for today. */
  currentTimeTopPct?: number | null;
};

export type WeekLayoutResult = {
  weekDateKeys: string[];
  days: DayLayoutResult[];
  allDayRows: AllDayLayoutItem[];
};
