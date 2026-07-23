import { shiftChicagoDateKey } from "@/lib/calendar/chicago-date";

const CRLF = "\r\n";
const DEFAULT_FOLD_OCTETS = 75;

/** Escape TEXT values per RFC 5545 §3.3.11. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/**
 * Fold a content line at maxLen octets (default 75) with CRLF + SPACE continuation.
 * Counts UTF-8 octets, not JS string length.
 */
export function foldIcsLine(line: string, maxLen = DEFAULT_FOLD_OCTETS): string {
  if (maxLen < 2) {
    throw new Error("ICS fold maxLen must be at least 2");
  }
  const buf = Buffer.from(line, "utf8");
  if (buf.length <= maxLen) return line;

  const parts: string[] = [];
  let offset = 0;
  let first = true;
  while (offset < buf.length) {
    const limit = first ? maxLen : maxLen - 1;
    let end = Math.min(offset + limit, buf.length);
    while (end > offset && (buf[end - 1] & 0xc0) === 0x80) {
      end -= 1;
    }
    if (end === offset) {
      end = Math.min(offset + limit, buf.length);
    }
    const chunk = buf.subarray(offset, end).toString("utf8");
    parts.push(first ? chunk : ` ${chunk}`);
    offset = end;
    first = false;
  }
  return parts.join(CRLF);
}

/** Join ICS content lines with CRLF and ensure a trailing CRLF. */
export function icsJoinLines(lines: string[]): string {
  if (lines.length === 0) return CRLF;
  const body = lines.join(CRLF);
  return body.endsWith(CRLF) ? body : `${body}${CRLF}`;
}

export function formatIcsUtcDateTime(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

/**
 * Local wall-clock DATE-TIME components in `timeZone` (no Z suffix).
 * Caller attaches TZID on the property line.
 */
export function formatIcsFloatingDateTime(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const y = get("year");
  const mo = get("month");
  const d = get("day");
  const h = get("hour") === "24" ? "00" : get("hour");
  const mi = get("minute");
  const s = get("second");
  return `${y}${mo}${d}T${h}${mi}${s}`;
}

/** YYYY-MM-DD → YYYYMMDD */
export function formatIcsDateOnly(dateKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Invalid ICS date key: ${dateKey}`);
  }
  return dateKey.replace(/-/g, "");
}

/**
 * All-day DTEND is exclusive. Given inclusive end date key, return exclusive
 * end as YYYYMMDD (one day after endDateKeyInclusive).
 */
export function exclusiveAllDayEnd(
  _startDateKey: string,
  endDateKeyInclusive: string,
): string {
  return formatIcsDateOnly(shiftChicagoDateKey(endDateKeyInclusive, 1));
}
