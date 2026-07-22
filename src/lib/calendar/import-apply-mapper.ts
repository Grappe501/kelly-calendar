/**
 * Pure mapping from staged import payloads → canonical Event create fields.
 * Used by CC-01 apply; safe for unit tests without Prisma.
 */

import { classifyImportedTitle } from "@/features/calendar-import/normalize-google-event";
import type { PrimaryCalendarProposal } from "@/features/calendar-import/import-types";
import {
  eventAppearsManuallyRescheduled,
  IMPORT_FIELD_PRECEDENCE,
} from "@/lib/calendar/import-provenance";

export type GoogleNormalizedImportPayload = {
  sourceSystem?: string;
  sourceCalendarId?: string;
  sourceEventId?: string | null;
  sourceRecurringEventId?: string | null;
  iCalUid?: string | null;
  status?: string | null;
  summary?: string | null;
  location?: string | null;
  start?: { date?: string; dateTime?: string; timeZone?: string } | null;
  end?: { date?: string; dateTime?: string; timeZone?: string } | null;
  created?: string | null;
  updated?: string | null;
  visibility?: string | null;
  eventType?: string | null;
  hasConference?: boolean;
};

export type ImportEventCreateFields = {
  internalTitle: string;
  campaignDisplayTitle: string;
  status: "HOLD" | "CANCELLED" | "DRAFT";
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  isAllDay: boolean;
  city: string | null;
  venueName: string | null;
  locationNotes: string | null;
  locationDisclosure: "CITY" | "HIDDEN";
  privateNotes: string | null;
  sourceType: string;
  isImported: true;
  historicalReviewStatus: "APPROVED";
  historicalAttendanceConfirmed: false;
  proposedCalendarType: PrimaryCalendarProposal | "CANDIDATE";
  externalEventId: string | null;
  iCalUid: string | null;
  sourceCancelled: boolean;
};

const CALENDAR_TYPE_TO_SLUG: Record<string, string> = {
  CANDIDATE: "candidate",
  TRAVEL: "travel",
  FUNDRAISING: "fundraising",
  PUBLIC_EVENTS: "public-events",
  INTERNAL_MEETINGS: "internal-meetings",
  COMMUNICATIONS: "communications",
  SOCIAL_MEDIA: "social-media",
  PRESS_MEDIA: "press-media",
  FIELD: "field",
  COUNTY_ACTIVITY: "county-activity",
  VOLUNTEER: "volunteer",
  COMPLIANCE: "compliance",
  STAFF_WORK: "staff-work",
  DEBATE_PREP: "debate-prep",
  SURROGATE: "surrogate",
  PROTECTED_PERSONAL: "protected-personal",
  UNCLASSIFIED: "public-events",
  COMMAND: "public-events",
  CUSTOM: "public-events",
};

export function calendarSlugForProposal(
  proposal: PrimaryCalendarProposal | string | undefined,
): string {
  if (!proposal) return "public-events";
  return CALENDAR_TYPE_TO_SLUG[proposal] ?? "public-events";
}

function parseGoogleInstant(
  value: { date?: string; dateTime?: string; timeZone?: string } | null | undefined,
  endOfAllDay: boolean,
): { at: Date; allDay: boolean; timezone: string } | null {
  if (!value) return null;
  const timezone = value.timeZone?.trim() || "America/Chicago";
  if (value.dateTime) {
    const at = new Date(value.dateTime);
    if (Number.isNaN(at.getTime())) return null;
    return { at, allDay: false, timezone };
  }
  if (value.date) {
    // All-day: interpret as Chicago calendar date bounds (CST/CDT offset handled by wall clock).
    const iso = endOfAllDay
      ? `${value.date}T23:59:59-06:00`
      : `${value.date}T00:00:00-06:00`;
    const at = new Date(iso);
    if (Number.isNaN(at.getTime())) return null;
    return { at, allDay: true, timezone: "America/Chicago" };
  }
  return null;
}

function cityFromLocation(location: string | null | undefined): string | null {
  if (!location?.trim()) return null;
  const first = location.split(",")[0]?.trim();
  return first || null;
}

export function mapNormalizedPayloadToEventFields(
  payload: GoogleNormalizedImportPayload | null | undefined,
  options?: { fingerprint?: string },
): ImportEventCreateFields {
  if (!payload) {
    throw new Error("Import record has no normalizedPayload.");
  }

  const start = parseGoogleInstant(payload.start, false);
  const end = parseGoogleInstant(payload.end, true);
  if (!start || !end) {
    throw new Error("Import record is missing valid start/end.");
  }
  if (end.at.getTime() < start.at.getTime()) {
    throw new Error("Import record end is before start.");
  }

  const title = (payload.summary ?? "").trim() || "Imported event (untitled)";
  const classification = classifyImportedTitle(title);
  const sourceCancelled = (payload.status ?? "").toLowerCase() === "cancelled";
  const fingerprintNote = options?.fingerprint
    ? `[importFingerprint:${options.fingerprint}]`
    : null;
  const location = payload.location?.trim() || null;

  return {
    internalTitle: title,
    campaignDisplayTitle: title,
    status: sourceCancelled ? "CANCELLED" : "HOLD",
    startsAt: start.at,
    endsAt: end.at,
    timezone: start.timezone || end.timezone || "America/Chicago",
    isAllDay: start.allDay || end.allDay,
    city: cityFromLocation(location),
    venueName: null,
    locationNotes: location,
    locationDisclosure: "CITY",
    privateNotes: [
      "SOURCE: Google Calendar import (IMPORT_ONLY).",
      "historicalAttendanceConfirmed=false — import does not prove attendance.",
      fingerprintNote,
      payload.sourceEventId ? `[sourceEventId:${payload.sourceEventId}]` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    sourceType: "GOOGLE_CALENDAR",
    isImported: true,
    historicalReviewStatus: "APPROVED",
    historicalAttendanceConfirmed: false,
    proposedCalendarType: classification.primaryCalendar,
    externalEventId: payload.sourceEventId ?? null,
    iCalUid: payload.iCalUid ?? null,
    sourceCancelled,
  };
}

export type ExistingEventForPrecedence = {
  internalTitle: string;
  campaignDisplayTitle: string;
  privateNotes: string | null;
  status: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  isAllDay: boolean;
  isImported: boolean;
  statusHistoryReasons: Array<string | null | undefined>;
  auditActions?: Array<string | null | undefined>;
};

/**
 * ADR-081 field merge: local title/notes/status win; source timing wins only when
 * the imported Event has never been manually rescheduled.
 */
export function mergeImportFieldsWithLocalPrecedence(
  existing: ExistingEventForPrecedence,
  incoming: ImportEventCreateFields,
): {
  data: Partial<{
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    isAllDay: boolean;
  }>;
  appliedSourceTiming: boolean;
  protectedLocalFields: readonly string[];
} {
  const manuallyRescheduled = eventAppearsManuallyRescheduled({
    statusHistoryReasons: existing.statusHistoryReasons,
    auditActions: existing.auditActions,
  });

  const protectedLocalFields = IMPORT_FIELD_PRECEDENCE.localWins;
  if (!existing.isImported || manuallyRescheduled) {
    return {
      data: {},
      appliedSourceTiming: false,
      protectedLocalFields,
    };
  }

  return {
    data: {
      startsAt: incoming.startsAt,
      endsAt: incoming.endsAt,
      timezone: incoming.timezone,
      isAllDay: incoming.isAllDay,
    },
    appliedSourceTiming: true,
    protectedLocalFields,
  };
}
