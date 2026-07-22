/**
 * CC-08 Scheduling Layout Engine — public API surface.
 * Build: KCCC-CC-08-SCHEDULING-LAYOUT-ENGINE-1.0
 *
 * Pure Day/Week grid layout math. No React, no drag-drop, no Prisma, no
 * persistence. UI components (owned by the parent pass) consume this
 * surface to render the actual grid.
 */

export type {
  SchedulingViewMode,
  LayoutDensity,
  LayoutPreferences,
  GridEventInput,
  ContinuityKind,
  TimedLayoutItem,
  AllDayLayoutItem,
  DayLayoutResult,
  WeekLayoutResult,
} from "@/lib/calendar/scheduling/types";

export {
  LAYOUT_PREFERENCES_SCHEMA_VERSION,
  DEFAULT_LAYOUT_PREFERENCES,
  LAYOUT_PREFERENCE_FILTER_KEYS,
  canonicalizeLayoutPreferences,
  serializeLayoutPreferences,
  parseLayoutPreferencesFromRecord,
  type LayoutPreferenceFilterKey,
} from "@/lib/calendar/scheduling/preferences";

export {
  packTimedLanes,
  intervalsOverlap,
  type PackableTimedItem,
  type LaneAssignment,
} from "@/lib/calendar/scheduling/pack-lanes";

export {
  minutesFromMidnight,
  clampVisibleRange,
  pointTopPct,
  hourLabels,
  type VisibleRangeResult,
} from "@/lib/calendar/scheduling/time-scale";

export {
  layoutCampaignDay,
  ALL_DAY_COLLAPSED_VISIBLE_COUNT,
  type LayoutCampaignDayInput,
} from "@/lib/calendar/scheduling/layout-day";

export {
  layoutCampaignWeek,
  type LayoutCampaignWeekInput,
} from "@/lib/calendar/scheduling/layout-week";
