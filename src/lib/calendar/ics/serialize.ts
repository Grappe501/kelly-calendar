import { createHash } from "node:crypto";
import {
  chicagoDateKey,
  shiftChicagoDateKey,
} from "@/lib/calendar/chicago-date";
import {
  escapeIcsText,
  exclusiveAllDayEnd,
  foldIcsLine,
  formatIcsDateOnly,
  formatIcsFloatingDateTime,
  formatIcsUtcDateTime,
  icsJoinLines,
} from "@/lib/calendar/ics/text";
import {
  ICS_PRODID,
  type IcsCalendarDocument,
  type IcsExportProjection,
} from "@/lib/calendar/ics/types";

function mapIcsStatus(event: IcsExportProjection): string {
  if (event.isCancelled || /cancel/i.test(event.status)) return "CANCELLED";
  if (/tentativ/i.test(event.status)) return "TENTATIVE";
  return "CONFIRMED";
}

function prop(name: string, value: string): string {
  return foldIcsLine(`${name}:${value}`);
}

function propParams(name: string, params: string, value: string): string {
  return foldIcsLine(`${name};${params}:${value}`);
}

function serializeEvent(event: IcsExportProjection): string[] {
  const lines: string[] = ["BEGIN:VEVENT"];
  lines.push(prop("UID", event.uid));
  lines.push(prop("DTSTAMP", formatIcsUtcDateTime(event.updatedAt)));

  if (event.isAllDay) {
    const startKey = chicagoDateKey(event.startsAt, event.timezone);
    const endInclusive = chicagoDateKey(
      new Date(event.endsAt.getTime() - 1),
      event.timezone,
    );
    // If endsAt is already midnight exclusive, chicagoDateKey(endsAt-1ms) is last inclusive day.
    const endExclusive = exclusiveAllDayEnd(startKey, endInclusive);
    lines.push(propParams("DTSTART", "VALUE=DATE", formatIcsDateOnly(startKey)));
    lines.push(propParams("DTEND", "VALUE=DATE", endExclusive));
  } else {
    const tz = event.timezone || "America/Chicago";
    const start = formatIcsFloatingDateTime(event.startsAt, tz);
    const end = formatIcsFloatingDateTime(event.endsAt, tz);
    lines.push(propParams("DTSTART", `TZID=${tz}`, start));
    lines.push(propParams("DTEND", `TZID=${tz}`, end));
  }

  lines.push(prop("SUMMARY", escapeIcsText(event.summary)));
  if (event.description) {
    lines.push(prop("DESCRIPTION", escapeIcsText(event.description)));
  }
  if (event.location) {
    lines.push(prop("LOCATION", escapeIcsText(event.location)));
  }
  lines.push(prop("STATUS", mapIcsStatus(event)));
  lines.push(prop("SEQUENCE", String(Math.max(0, event.sequence | 0))));
  lines.push(prop("CREATED", formatIcsUtcDateTime(event.createdAt)));
  lines.push(prop("LAST-MODIFIED", formatIcsUtcDateTime(event.updatedAt)));
  if (event.url) {
    lines.push(prop("URL", event.url));
  }
  if (event.recurrenceRule) {
    lines.push(prop("RRULE", event.recurrenceRule));
  }
  if (event.recurrenceId) {
    if (/^\d{8}$/.test(event.recurrenceId)) {
      lines.push(propParams("RECURRENCE-ID", "VALUE=DATE", event.recurrenceId));
    } else {
      lines.push(prop("RECURRENCE-ID", event.recurrenceId));
    }
  }
  if (event.exdates?.length) {
    lines.push(prop("EXDATE", event.exdates.join(",")));
  }
  if (event.rdates?.length) {
    lines.push(prop("RDATE", event.rdates.join(",")));
  }
  lines.push("END:VEVENT");
  return lines;
}

function compareEvents(a: IcsExportProjection, b: IcsExportProjection): number {
  const t = a.startsAt.getTime() - b.startsAt.getTime();
  if (t !== 0) return t;
  return a.uid.localeCompare(b.uid);
}

/** Serialize a calendar document to RFC 5545 text (CRLF). */
export function serializeIcsCalendar(doc: IcsCalendarDocument): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    prop("VERSION", "2.0"),
    prop("PRODID", doc.prodId ?? ICS_PRODID),
    prop("CALSCALE", "GREGORIAN"),
    prop("METHOD", doc.method ?? "PUBLISH"),
  ];
  if (doc.calendarName?.trim()) {
    lines.push(prop("X-WR-CALNAME", escapeIcsText(doc.calendarName.trim())));
  }

  const events = [...doc.events].sort(compareEvents);
  for (const event of events) {
    lines.push(...serializeEvent(event));
  }
  lines.push("END:VCALENDAR");
  return icsJoinLines(lines);
}

/** Weak ETag from SHA-256 of the ICS body (quoted). */
export function computeIcsBodyEtag(body: string): string {
  const hex = createHash("sha256").update(body, "utf8").digest("hex");
  return `W/"${hex}"`;
}

/** Inclusive all-day end key from exclusive midnight instant (helper for callers). */
export function inclusiveAllDayEndKey(
  endsAtExclusive: Date,
  timeZone: string,
): string {
  return shiftChicagoDateKey(chicagoDateKey(endsAtExclusive, timeZone), -1);
}
