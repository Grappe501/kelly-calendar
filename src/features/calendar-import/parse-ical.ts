import { IMPORT_LIMITS } from "@/features/calendar-import/import-limits";
import type { ParsedIcalEvent } from "@/features/calendar-import/import-types";
import { AppError } from "@/lib/security/safe-error";

function unfoldIcs(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function stripHtml(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseProperty(line: string): { name: string; params: string; value: string } {
  const colon = line.indexOf(":");
  if (colon < 0) return { name: line, params: "", value: "" };
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const semi = left.indexOf(";");
  if (semi < 0) return { name: left.toUpperCase(), params: "", value };
  return {
    name: left.slice(0, semi).toUpperCase(),
    params: left.slice(semi + 1),
    value,
  };
}

function paramHasDate(params: string): boolean {
  return /VALUE=DATE(?!-)/i.test(params);
}

/**
 * Minimal ICS VEVENT parser for Google public calendars.
 * Not a full RFC 5545 implementation — bounded and fail-soft.
 */
export function parseIcalEvents(rawIcs: string): ParsedIcalEvent[] {
  if (!rawIcs || typeof rawIcs !== "string") {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Calendar feed is empty or unreadable.",
    });
  }
  if (!/BEGIN:VCALENDAR/i.test(rawIcs)) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 400,
      publicMessage: "Feed is not a valid iCalendar document.",
    });
  }

  const text = unfoldIcs(rawIcs);
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1);
  if (blocks.length > IMPORT_LIMITS.maxEventsPerImport) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      status: 413,
      publicMessage: "Calendar contains more events than the import limit allows.",
    });
  }

  const events: ParsedIcalEvent[] = [];
  for (const blockRaw of blocks) {
    const end = blockRaw.search(/END:VEVENT/i);
    const block = end >= 0 ? blockRaw.slice(0, end) : blockRaw;
    const event: ParsedIcalEvent = { rawBlock: block };
    for (const line of block.split("\n")) {
      if (!line.trim()) continue;
      const { name, params, value } = parseProperty(line.trim());
      switch (name) {
        case "UID":
          event.uid = value.trim();
          break;
        case "SUMMARY":
          event.summary = stripHtml(value).slice(0, IMPORT_LIMITS.maxTitleLength);
          break;
        case "DESCRIPTION":
          event.description = stripHtml(value).slice(0, IMPORT_LIMITS.maxDescriptionLength);
          break;
        case "LOCATION":
          event.location = stripHtml(value).slice(0, IMPORT_LIMITS.maxLocationLength);
          break;
        case "URL":
          event.url = value.trim().slice(0, 2_000);
          break;
        case "STATUS":
          event.status = value.trim().toUpperCase();
          break;
        case "DTSTART":
          event.dtstart = value.trim();
          event.dtstartValueType = paramHasDate(params) ? "DATE" : "DATE-TIME";
          break;
        case "DTEND":
          event.dtend = value.trim();
          break;
        case "RRULE":
          event.rrule = value.trim();
          break;
        case "EXDATE":
          event.exdate = [event.exdate, value.trim()].filter(Boolean).join(",");
          break;
        case "RDATE":
          event.rdate = [event.rdate, value.trim()].filter(Boolean).join(",");
          break;
        case "RECURRENCE-ID":
          event.recurrenceId = value.trim();
          break;
        case "SEQUENCE":
          event.sequence = Number.parseInt(value, 10) || 0;
          break;
        case "LAST-MODIFIED":
          event.lastModified = value.trim();
          break;
        default:
          break;
      }
    }
    if (event.dtstart) events.push(event);
  }
  return events;
}
