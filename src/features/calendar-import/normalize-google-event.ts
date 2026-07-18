import { createHash } from "node:crypto";
import { IMPORT_TIMEZONE } from "@/features/calendar-import/import-limits";
import type {
  ImportRangeOptions,
  ParsedIcalEvent,
  PrimaryCalendarProposal,
  StagedCalendarEvent,
} from "@/features/calendar-import/import-types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parse ICS DATE (YYYYMMDD) or DATE-TIME into ISO strings in America/Chicago when floating. */
export function icsDateToIso(
  value: string,
  valueType: "DATE" | "DATE-TIME" | undefined,
  endOfDay = false,
): { iso: string; allDay: boolean } {
  const v = value.trim();
  if (valueType === "DATE" || /^\d{8}$/.test(v)) {
    const y = v.slice(0, 4);
    const m = v.slice(4, 6);
    const d = v.slice(6, 8);
    const iso = endOfDay
      ? `${y}-${m}-${d}T23:59:59-06:00`
      : `${y}-${m}-${d}T00:00:00-06:00`;
    return { iso, allDay: true };
  }

  // YYYYMMDDTHHMMSSZ or with TZ
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (m) {
    const [, Y, Mo, D, h, mi, s, z] = m;
    if (z) {
      return {
        iso: new Date(`${Y}-${Mo}-${D}T${h}:${mi}:${s}Z`).toISOString(),
        allDay: false,
      };
    }
    return {
      iso: `${Y}-${Mo}-${D}T${h}:${mi}:${s}-06:00`,
      allDay: false,
    };
  }

  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    return { iso: parsed.toISOString(), allDay: false };
  }
  return { iso: new Date().toISOString(), allDay: false };
}

export function buildEventFingerprint(parts: {
  iCalUid?: string;
  startsAt: string;
  endsAt: string;
  title: string;
  sourceFingerprint: string;
}): string {
  const basis = [
    parts.iCalUid ?? "",
    parts.startsAt,
    parts.endsAt,
    parts.title.trim().toLowerCase(),
    parts.sourceFingerprint,
  ].join("|");
  return createHash("sha256").update(basis).digest("hex").slice(0, 24);
}

export function classifyImportedTitle(title: string): {
  primaryCalendar: PrimaryCalendarProposal;
  confidence: number;
  reasons: string[];
} {
  const t = title.toLowerCase();
  const reasons: string[] = [];
  const hit = (calendar: PrimaryCalendarProposal, reason: string, confidence: number) => ({
    primaryCalendar: calendar,
    confidence,
    reasons: [...reasons, reason],
  });

  if (/\b(fundrais|donor|call time|finance)\b/.test(t)) {
    return hit("FUNDRAISING", "Title keywords suggest fundraising", 0.7);
  }
  if (/\b(travel|drive to|flight|hotel)\b/.test(t)) {
    return hit("TRAVEL", "Title keywords suggest travel", 0.7);
  }
  if (/\b(press|interview|media)\b/.test(t)) {
    return hit("PRESS_MEDIA", "Title keywords suggest press/media", 0.65);
  }
  if (/\b(social|recording|content)\b/.test(t)) {
    return hit("SOCIAL_MEDIA", "Title keywords suggest social media", 0.6);
  }
  if (/\b(volunteer|canvass|phonebank)\b/.test(t)) {
    return hit("VOLUNTEER", "Title keywords suggest volunteer ops", 0.65);
  }
  if (/\b(debate|forum)\b/.test(t)) {
    return hit("DEBATE_PREP", "Title keywords suggest debate/forum", 0.6);
  }
  if (/\b(personal|doctor|dental|private)\b/.test(t)) {
    return hit("PROTECTED_PERSONAL", "Title keywords suggest protected personal time", 0.55);
  }
  if (/\b(fair|parade|festival|town hall|meet and greet|county)\b/.test(t)) {
    return hit("PUBLIC_EVENTS", "Title keywords suggest public event", 0.65);
  }
  reasons.push("No strong keyword match; left unclassified for review");
  return { primaryCalendar: "UNCLASSIFIED", confidence: 0.2, reasons };
}

function proposeGeography(location?: string): StagedCalendarEvent["geographicProposal"] {
  if (!location) {
    return { needsReview: true };
  }
  const raw = location;
  const stateMatch = raw.match(/\b(AR|Arkansas)\b/i);
  const cityGuess = raw.split(",")[0]?.trim();
  return {
    rawLocation: raw,
    venue: raw.includes(",") ? undefined : raw,
    city: cityGuess && cityGuess.length < 40 ? cityGuess : undefined,
    state: stateMatch ? "Arkansas" : undefined,
    needsReview: true,
  };
}

export function normalizeParsedEvent(options: {
  event: ParsedIcalEvent;
  sourceType: "PUBLIC_ICAL" | "GOOGLE_API";
  sourceLabel: string;
  sourceFingerprint: string;
  range: ImportRangeOptions;
  stagedEventId: string;
}): StagedCalendarEvent | null {
  const { event, range } = options;
  const status = (event.status ?? "CONFIRMED").toUpperCase();
  if (!range.includeCancelled && status === "CANCELLED") return null;

  const start = icsDateToIso(event.dtstart!, event.dtstartValueType);
  const end = event.dtend
    ? icsDateToIso(event.dtend, event.dtstartValueType, true)
    : start;

  if (!range.includeAllDay && start.allDay) return null;

  const startMs = new Date(start.iso).getTime();
  const endMs = new Date(end.iso).getTime();
  const rangeStart = new Date(range.startsAt).getTime();
  const rangeEnd = new Date(range.endsAt).getTime();
  // Include events that overlap the range (ending after start)
  if (endMs < rangeStart || startMs > rangeEnd) return null;

  const title = event.summary?.trim() || "(Untitled imported event)";
  const classification = classifyImportedTitle(title);
  const fingerprint = buildEventFingerprint({
    iCalUid: event.uid,
    startsAt: start.iso,
    endsAt: end.iso,
    title,
    sourceFingerprint: options.sourceFingerprint,
  });

  return {
    stagedEventId: options.stagedEventId,
    source: {
      provider: "GOOGLE_CALENDAR",
      sourceType: options.sourceType,
      sourceCalendarLabel: options.sourceLabel,
      iCalUid: event.uid,
      recurringEventId: event.rrule ? event.uid : undefined,
      sourceFingerprint: options.sourceFingerprint,
      sourceLastModifiedAt: event.lastModified,
      sourceSequence: event.sequence,
    },
    timing: {
      startsAt: start.iso,
      endsAt: end.iso,
      timezone: IMPORT_TIMEZONE,
      allDay: start.allDay,
      recurring: Boolean(event.rrule || event.recurrenceId),
      recurrenceRule: event.rrule,
      originalStartTime: event.recurrenceId
        ? icsDateToIso(event.recurrenceId, undefined).iso
        : undefined,
    },
    basic: {
      importedTitle: title,
      importedDescription: range.importDescriptions ? event.description : undefined,
      importedLocation: range.importLocations ? event.location : undefined,
      importedStatus: status,
      importedUrl: range.importLinks ? event.url : undefined,
    },
    proposedClassification: classification,
    geographicProposal: proposeGeography(
      range.importLocations ? event.location : undefined,
    ),
    deduplication: {
      fingerprint,
      status: "NEW",
      matchedStagedEventIds: [],
      reasons: [],
    },
    review: { status: "UNREVIEWED" },
    enrichment: {
      kellyPresent: null,
      wasCampaignEvent: null,
      travelOnly: null,
      followUpRequired: null,
    },
  };
}

export function todayChicagoDateString(now = new Date()): string {
  // Approximate Chicago date for defaults (CST/CDT handled by Intl)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IMPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

export function defaultImportEndIso(now = new Date()): string {
  const date = todayChicagoDateString(now);
  return `${date}T23:59:59-05:00`;
}

export function formatStamp(now = new Date()): string {
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}
