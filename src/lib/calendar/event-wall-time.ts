/**
 * Chicago wall-clock helpers for event create/edit forms.
 * Build: KCCC-EA-11-EVENT-CREATION-EDITING-1.0
 */

import { chicagoDateKey } from "@/lib/calendar/chicago-date";

/** Convert a Chicago calendar date + HH:mm wall time to a UTC Date. */
export function chicagoWallTimeToUtc(dateKey: string, hhmm: string): Date {
  const normalized = hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  const candidates = [
    new Date(`${dateKey}T${normalized}-05:00`),
    new Date(`${dateKey}T${normalized}-06:00`),
  ];
  return (
    candidates.find((d) => chicagoDateKey(d) === dateKey) ?? candidates[0]
  );
}

export function durationPresetToMinutes(preset: string): number {
  switch (preset) {
    case "15 minutes":
      return 15;
    case "30 minutes":
      return 30;
    case "45 minutes":
      return 45;
    case "1 hour":
      return 60;
    case "90 minutes":
      return 90;
    case "2 hours":
      return 120;
    case "3 hours":
      return 180;
    case "Half day":
      return 240;
    case "Full day":
      return 480;
    default:
      return 60;
  }
}

export function endsAtFromStartAndDuration(
  startsAt: Date,
  durationPreset: string,
): Date {
  return new Date(
    startsAt.getTime() + durationPresetToMinutes(durationPreset) * 60_000,
  );
}
