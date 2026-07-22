/**
 * Bounded RRULE expansion for historical review (CC-04).
 * Uses the shared recurrence expand core + CC-03 wall times.
 */

import { IMPORT_LIMITS } from "@/features/calendar-import/import-limits";
import type { ParsedIcalEvent } from "@/features/calendar-import/import-types";
import { icsDateToIso } from "@/features/calendar-import/normalize-google-event";
import { expandRecurrenceOccurrences } from "@/lib/calendar/recurrence";
import { wallPartsInTimeZone, CAMPAIGN_TIMEZONE } from "@/lib/calendar/temporal";

function parseExdates(raw: string | undefined): string[] {
  if (!raw) return [];
  // Comma-separated ICS dates or date-times
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((token) => {
      if (/^\d{8}$/.test(token)) {
        return `${token.slice(0, 4)}-${token.slice(4, 6)}-${token.slice(6, 8)}`;
      }
      try {
        const iso = icsDateToIso(token, token.length === 8 ? "DATE" : "DATE-TIME");
        const parts = wallPartsInTimeZone(new Date(iso.iso), CAMPAIGN_TIMEZONE);
        return iso.allDay ? parts.dateKey : `${parts.dateKey}T${parts.hhmm}`;
      } catch {
        return token;
      }
    });
}

export function expandSimpleRecurrence(
  event: ParsedIcalEvent,
  rangeStartIso: string,
  rangeEndIso: string,
): ParsedIcalEvent[] {
  if (!event.rrule || !event.dtstart) return [event];

  const start = icsDateToIso(event.dtstart, event.dtstartValueType);
  const end = event.dtend
    ? icsDateToIso(event.dtend, event.dtstartValueType, true)
    : start;
  const durationMs =
    new Date(end.iso).getTime() - new Date(start.iso).getTime() || 60 * 60 * 1000;
  const durationMinutes = Math.max(1, Math.round(durationMs / 60_000));
  const timezone = CAMPAIGN_TIMEZONE;
  const isAllDay = Boolean(start.allDay);
  const startParts = wallPartsInTimeZone(new Date(start.iso), timezone);
  const dtstartLocal = isAllDay
    ? startParts.dateKey
    : `${startParts.dateKey}T${startParts.hhmm}`;

  const rangeStartParts = wallPartsInTimeZone(new Date(rangeStartIso), timezone);
  const rangeEndParts = wallPartsInTimeZone(new Date(rangeEndIso), timezone);

  const expansion = expandRecurrenceOccurrences({
    seriesId: event.uid || "import",
    rrule: event.rrule,
    dtstartLocal,
    timezone,
    isAllDay,
    durationMinutes,
    windowStartLocal: `${rangeStartParts.dateKey}T00:00`,
    windowEndLocal: `${rangeEndParts.dateKey}T23:59`,
    maxOccurrences: IMPORT_LIMITS.maxRecurrenceInstances,
    exdatesLocal: parseExdates(event.exdate),
  });

  if (!expansion.ok) {
    // Unsupported — keep master for review
    return [event];
  }

  const instances: ParsedIcalEvent[] = [];
  for (const occ of expansion.occurrences) {
    if (occ.lifecycle === "REQUIRES_REVIEW") continue;
    if (Number.isNaN(occ.startsAt.getTime())) continue;
    instances.push({
      ...event,
      rrule: undefined,
      recurrenceId: occ.startsAt.toISOString(),
      dtstart: occ.startsAt
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, ""),
      dtend: occ.endsAt
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, ""),
      dtstartValueType: isAllDay ? "DATE" : "DATE-TIME",
    });
  }

  return instances.length ? instances : [event];
}
