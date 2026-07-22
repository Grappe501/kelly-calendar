/**
 * Wall-clock ↔ instant conversion with DST gap/ambiguity detection.
 * Uses Intl only (no extra date library). Campaign default: America/Chicago.
 */

import {
  CAMPAIGN_TIMEZONE,
  type DstDisambiguation,
  type WallTimeResolveResult,
} from "@/lib/calendar/temporal/types";

const OFFSET_CANDIDATES_MINUTES = [
  -300, // CDT UTC-5
  -360, // CST UTC-6
  -240, // EDT
  -480, // PST
  0, // UTC
];

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function dateKeyInTimeZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function wallPartsInTimeZone(
  instant: Date,
  timeZone: string,
): { dateKey: string; hhmm: string; offsetMinutes: number } {
  const dateKey = dateKeyInTimeZone(instant, timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "shortOffset",
  }).formatToParts(instant);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const offsetMinutes = parseShortOffset(tzName);
  return {
    dateKey,
    hhmm: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
    offsetMinutes,
  };
}

function parseShortOffset(label: string): number {
  // GMT-5 / GMT-05:00 / UTC-6
  const m = label.match(/(?:GMT|UTC)?([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  const hours = Number(m[2]);
  const mins = Number(m[3] ?? "0");
  return sign * (hours * 60 + mins);
}

function applyOffset(dateKey: string, hhmmss: string, offsetMinutes: number): Date {
  const sign = offsetMinutes <= 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  return new Date(`${dateKey}T${hhmmss}${sign}${oh}:${om}`);
}

function wallMatches(
  instant: Date,
  timeZone: string,
  dateKey: string,
  hhmm: string,
): boolean {
  const parts = wallPartsInTimeZone(instant, timeZone);
  return parts.dateKey === dateKey && parts.hhmm === hhmm;
}

/**
 * Resolve a local wall time in an IANA zone to a UTC instant.
 * Spring-forward gaps → NONEXISTENT. Fall-back duplicates → ambiguous.
 */
export function resolveWallTime(input: {
  dateKey: string;
  time: string; // HH:mm or HH:mm:ss
  timeZone?: string;
  disambiguation?: DstDisambiguation;
}): WallTimeResolveResult {
  const timeZone = input.timeZone?.trim() || CAMPAIGN_TIMEZONE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateKey)) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Date must be YYYY-MM-DD.",
    };
  }
  if (!isValidIanaTimeZone(timeZone)) {
    return {
      ok: false,
      code: "INVALID_TIMEZONE",
      message: `Unknown timezone “${timeZone}”.`,
    };
  }
  const hhmm = input.time.length >= 5 ? input.time.slice(0, 5) : input.time;
  if (!/^\d{2}:\d{2}$/.test(hhmm)) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Time must be HH:mm.",
    };
  }
  const hhmmss = `${hhmm}:00`;

  const matches: Array<{ instant: Date; offsetMinutes: number }> = [];
  const seen = new Set<number>();
  for (const offset of OFFSET_CANDIDATES_MINUTES) {
    const instant = applyOffset(input.dateKey, hhmmss, offset);
    if (Number.isNaN(instant.getTime())) continue;
    if (!wallMatches(instant, timeZone, input.dateKey, hhmm)) continue;
    if (seen.has(instant.getTime())) continue;
    seen.add(instant.getTime());
    const parts = wallPartsInTimeZone(instant, timeZone);
    matches.push({ instant, offsetMinutes: parts.offsetMinutes });
  }

  // Broader probe: iterate nearby UTC guesses around noon on that date
  if (matches.length === 0) {
    const noonGuess = new Date(`${input.dateKey}T12:00:00Z`);
    for (let deltaH = -18; deltaH <= 18; deltaH += 1) {
      const probe = new Date(noonGuess.getTime() + deltaH * 3600_000);
      // Adjust minutes to target wall time via binary-ish correction
      const wall = wallPartsInTimeZone(probe, timeZone);
      if (wall.dateKey !== input.dateKey) continue;
      const [th, tm] = hhmm.split(":").map(Number);
      const [wh, wm] = wall.hhmm.split(":").map(Number);
      const diffMin = th * 60 + tm - (wh * 60 + wm);
      const corrected = new Date(probe.getTime() + diffMin * 60_000);
      if (!wallMatches(corrected, timeZone, input.dateKey, hhmm)) continue;
      if (seen.has(corrected.getTime())) continue;
      seen.add(corrected.getTime());
      const parts = wallPartsInTimeZone(corrected, timeZone);
      matches.push({ instant: corrected, offsetMinutes: parts.offsetMinutes });
    }
  }

  if (matches.length === 0) {
    return {
      ok: false,
      code: "NONEXISTENT",
      message: `That local time does not exist on ${input.dateKey} in ${timeZone} (daylight-saving gap).`,
    };
  }

  if (matches.length === 1) {
    return {
      ok: true,
      instant: matches[0].instant,
      offsetMinutes: matches[0].offsetMinutes,
      ambiguous: false,
    };
  }

  matches.sort((a, b) => a.instant.getTime() - b.instant.getTime());
  const earlier = matches[0];
  const later = matches[matches.length - 1];
  const choice =
    input.disambiguation === "LATER"
      ? later
      : input.disambiguation === "EARLIER"
        ? earlier
        : earlier;

  return {
    ok: true,
    instant: choice.instant,
    offsetMinutes: choice.offsetMinutes,
    ambiguous: true,
    alternatives: matches.map((m, i) => ({
      instant: m.instant,
      offsetMinutes: m.offsetMinutes,
      label: i === 0 ? "earlier" : "later",
    })),
  };
}

/** Campaign Chicago convenience — preserves prior API behavior when unambiguous. */
export function chicagoWallTimeToUtc(
  dateKey: string,
  hhmm: string,
  disambiguation?: DstDisambiguation,
): Date {
  const result = resolveWallTime({
    dateKey,
    time: hhmm,
    timeZone: CAMPAIGN_TIMEZONE,
    disambiguation,
  });
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.instant;
}
