import { IMPORT_LIMITS } from "@/features/calendar-import/import-limits";
import type { ParsedIcalEvent } from "@/features/calendar-import/import-types";
import { icsDateToIso } from "@/features/calendar-import/normalize-google-event";

/**
 * Bounded weekly/daily RRULE expansion for historical review.
 * Google public ICS often already expands instances; this covers simple masters.
 */
export function expandSimpleRecurrence(
  event: ParsedIcalEvent,
  rangeStartIso: string,
  rangeEndIso: string,
): ParsedIcalEvent[] {
  if (!event.rrule || !event.dtstart) return [event];

  const rule = event.rrule.toUpperCase();
  const freqDaily = /FREQ=DAILY/.test(rule);
  const freqWeekly = /FREQ=WEEKLY/.test(rule);
  if (!freqDaily && !freqWeekly) {
    // Unsupported complex rules — keep master for review
    return [event];
  }

  const intervalMatch = rule.match(/INTERVAL=(\d+)/);
  const interval = intervalMatch ? Number(intervalMatch[1]) : 1;
  const countMatch = rule.match(/COUNT=(\d+)/);
  const untilMatch = rule.match(/UNTIL=([0-9TZ]+)/);

  const start = icsDateToIso(event.dtstart, event.dtstartValueType);
  const end = event.dtend
    ? icsDateToIso(event.dtend, event.dtstartValueType, true)
    : start;
  const durationMs =
    new Date(end.iso).getTime() - new Date(start.iso).getTime() || 60 * 60 * 1000;

  const rangeStart = new Date(rangeStartIso).getTime();
  const rangeEnd = new Date(rangeEndIso).getTime();
  const until = untilMatch
    ? icsDateToIso(untilMatch[1], untilMatch[1].length === 8 ? "DATE" : "DATE-TIME")
        .iso
    : rangeEndIso;
  const untilMs = new Date(until).getTime();
  const maxCount = countMatch
    ? Number(countMatch[1])
    : IMPORT_LIMITS.maxRecurrenceInstances;

  const instances: ParsedIcalEvent[] = [];
  let cursor = new Date(start.iso).getTime();
  let produced = 0;
  const stepMs = (freqDaily ? 1 : 7) * interval * 24 * 60 * 60 * 1000;

  while (cursor <= Math.min(untilMs, rangeEnd) && produced < maxCount) {
    const occEnd = cursor + durationMs;
    if (occEnd >= rangeStart && cursor <= rangeEnd) {
      const occStartIso = new Date(cursor).toISOString();
      const occEndIso = new Date(occEnd).toISOString();
      instances.push({
        ...event,
        rrule: undefined,
        recurrenceId: occStartIso,
        dtstart: occStartIso.replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
        dtend: occEndIso.replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
        dtstartValueType: "DATE-TIME",
      });
      produced += 1;
    }
    cursor += stepMs;
    if (instances.length >= IMPORT_LIMITS.maxRecurrenceInstances) break;
  }

  return instances.length ? instances : [event];
}
