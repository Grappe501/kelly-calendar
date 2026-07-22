/**
 * CC-08 Scheduling Layout Engine — layout preferences (pure).
 * Build: KCCC-CC-08-SCHEDULING-LAYOUT-ENGINE-1.0
 *
 * Canonicalization + serialization for per-viewer Day/Week grid display
 * preferences. These are presentation-only knobs (visible hour range,
 * density, etc.) — never security/visibility filters. This module never
 * reads or writes storage; it has no side effects and never auto-creates
 * a persisted preference record. Callers own load/save.
 */

import type { LayoutDensity, LayoutPreferences } from "@/lib/calendar/scheduling/types";

export const LAYOUT_PREFERENCES_SCHEMA_VERSION = 1 as const;

export const DEFAULT_LAYOUT_PREFERENCES: LayoutPreferences = {
  visibleStartHour: 6,
  visibleEndHour: 22,
  density: "comfortable",
  showWeekends: true,
  allDayExpanded: true,
  showAvailability: true,
  showConflicts: true,
  workweekOnly: false,
};

const LAYOUT_DENSITIES: readonly LayoutDensity[] = ["compact", "comfortable"];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Merge a (possibly partial / possibly malformed) preferences object over
 * the documented defaults, clamping and coercing every field to a safe
 * value. Never throws. Never mutates `partial`.
 */
export function canonicalizeLayoutPreferences(
  partial?: Partial<LayoutPreferences> | null,
): LayoutPreferences {
  const source = partial ?? {};

  let visibleStartHour = isFiniteNumber(source.visibleStartHour)
    ? clampInt(source.visibleStartHour, 0, 23)
    : DEFAULT_LAYOUT_PREFERENCES.visibleStartHour;

  let visibleEndHour = isFiniteNumber(source.visibleEndHour)
    ? clampInt(source.visibleEndHour, 1, 24)
    : DEFAULT_LAYOUT_PREFERENCES.visibleEndHour;

  // Guarantee a non-degenerate visible window (>= 1 hour). If the caller
  // supplied an inverted/degenerate range, fall back to the defaults
  // rather than guessing at intent.
  if (visibleEndHour <= visibleStartHour) {
    visibleStartHour = DEFAULT_LAYOUT_PREFERENCES.visibleStartHour;
    visibleEndHour = DEFAULT_LAYOUT_PREFERENCES.visibleEndHour;
  }

  const density: LayoutDensity = LAYOUT_DENSITIES.includes(source.density as LayoutDensity)
    ? (source.density as LayoutDensity)
    : DEFAULT_LAYOUT_PREFERENCES.density;

  const boolField = (value: unknown, fallback: boolean): boolean =>
    typeof value === "boolean" ? value : fallback;

  return {
    visibleStartHour,
    visibleEndHour,
    density,
    showWeekends: boolField(source.showWeekends, DEFAULT_LAYOUT_PREFERENCES.showWeekends),
    allDayExpanded: boolField(source.allDayExpanded, DEFAULT_LAYOUT_PREFERENCES.allDayExpanded),
    showAvailability: boolField(
      source.showAvailability,
      DEFAULT_LAYOUT_PREFERENCES.showAvailability,
    ),
    showConflicts: boolField(source.showConflicts, DEFAULT_LAYOUT_PREFERENCES.showConflicts),
    workweekOnly: boolField(source.workweekOnly, DEFAULT_LAYOUT_PREFERENCES.workweekOnly),
  };
}

/**
 * Flat extension-key names used to persist layout preferences inside a
 * Calendar saved view's `filtersJson` (or any other flat Record store)
 * alongside the CC-07 query contract, without colliding with its keys.
 */
export const LAYOUT_PREFERENCE_FILTER_KEYS = [
  "layoutVisibleStartHour",
  "layoutVisibleEndHour",
  "layoutDensity",
  "layoutShowWeekends",
  "layoutAllDayExpanded",
  "layoutShowAvailability",
  "layoutShowConflicts",
  "layoutWorkweekOnly",
] as const;

export type LayoutPreferenceFilterKey = (typeof LAYOUT_PREFERENCE_FILTER_KEYS)[number];

/**
 * Serialize canonical preferences into flat extension keys suitable for
 * merging into a saved view's `filtersJson` record.
 */
export function serializeLayoutPreferences(
  preferences: LayoutPreferences,
): Record<LayoutPreferenceFilterKey, string | number | boolean> {
  const canonical = canonicalizeLayoutPreferences(preferences);
  return {
    layoutVisibleStartHour: canonical.visibleStartHour,
    layoutVisibleEndHour: canonical.visibleEndHour,
    layoutDensity: canonical.density,
    layoutShowWeekends: canonical.showWeekends,
    layoutAllDayExpanded: canonical.allDayExpanded,
    layoutShowAvailability: canonical.showAvailability,
    layoutShowConflicts: canonical.showConflicts,
    layoutWorkweekOnly: canonical.workweekOnly,
  };
}

/**
 * Read layout preferences back out of a flat Record (e.g. a saved view's
 * `filtersJson` after JSON.parse). Tolerant of missing/unknown/malformed
 * keys — always returns a fully canonical `LayoutPreferences`. Never
 * creates or persists anything; a caller with no stored record simply
 * gets `DEFAULT_LAYOUT_PREFERENCES` back.
 */
export function parseLayoutPreferencesFromRecord(
  record?: Record<string, unknown> | null,
): LayoutPreferences {
  if (!record || typeof record !== "object") {
    return canonicalizeLayoutPreferences(null);
  }
  const raw = record as Record<string, unknown>;
  const numOrUndefined = (v: unknown): number | undefined =>
    isFiniteNumber(v) ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))
      ? Number(v)
      : undefined;
  const boolOrUndefined = (v: unknown): boolean | undefined => {
    if (typeof v === "boolean") return v;
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
    return undefined;
  };

  return canonicalizeLayoutPreferences({
    visibleStartHour: numOrUndefined(raw.layoutVisibleStartHour),
    visibleEndHour: numOrUndefined(raw.layoutVisibleEndHour),
    density:
      raw.layoutDensity === "compact" || raw.layoutDensity === "comfortable"
        ? raw.layoutDensity
        : undefined,
    showWeekends: boolOrUndefined(raw.layoutShowWeekends),
    allDayExpanded: boolOrUndefined(raw.layoutAllDayExpanded),
    showAvailability: boolOrUndefined(raw.layoutShowAvailability),
    showConflicts: boolOrUndefined(raw.layoutShowConflicts),
    workweekOnly: boolOrUndefined(raw.layoutWorkweekOnly),
  });
}
