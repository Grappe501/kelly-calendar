/**
 * Chicago wall-clock helpers for event create/edit forms.
 * CC-03: delegates to authoritative temporal service (DST gap/ambiguity aware).
 */

import { chicagoWallTimeToUtc as resolveChicago } from "@/lib/calendar/temporal";

/** Convert a Chicago calendar date + HH:mm wall time to a UTC Date. */
export function chicagoWallTimeToUtc(dateKey: string, hhmm: string): Date {
  return resolveChicago(dateKey, hhmm);
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
