import type { GoogleCalendarEvent } from "@/features/google-integration/calendar-api-client";
import type { GoogleReconcileStatus } from "@prisma/client";

export type ReconcileCandidate = {
  eventId: string;
  eventNumber: string;
  iCalUid: string | null;
  externalEventId: string | null;
  title: string;
  startsAt: Date;
};

export type ReconcileResult = {
  status: GoogleReconcileStatus;
  matchedEventId?: string;
  reasons: string[];
};

function normalizeTitle(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Evidence-based reconciliation. Never title-only merge for AUTO_MATCH.
 */
export function reconcileGoogleEvent(
  google: GoogleCalendarEvent,
  candidates: ReconcileCandidate[],
): ReconcileResult {
  const byExternal = candidates.filter(
    (c) => google.id && c.externalEventId && c.externalEventId === google.id,
  );
  if (byExternal.length === 1) {
    return {
      status: "AUTO_MATCH_HIGH_CONFIDENCE",
      matchedEventId: byExternal[0].eventId,
      reasons: ["matching_google_event_id"],
    };
  }
  if (byExternal.length > 1) {
    return { status: "SOURCE_CONFLICT", reasons: ["multiple_google_event_id_matches"] };
  }

  const byUid = candidates.filter(
    (c) => google.iCalUID && c.iCalUid && c.iCalUid === google.iCalUID,
  );
  if (byUid.length === 1) {
    return {
      status: "AUTO_MATCH_HIGH_CONFIDENCE",
      matchedEventId: byUid[0].eventId,
      reasons: ["matching_ical_uid"],
    };
  }
  if (byUid.length > 1) {
    return { status: "SOURCE_CONFLICT", reasons: ["multiple_ical_uid_matches"] };
  }

  const startIso =
    google.start?.dateTime ??
    (google.start?.date ? `${google.start.date}T00:00:00.000Z` : null);
  if (!startIso) {
    return { status: "NO_MATCH", reasons: ["missing_google_start"] };
  }
  const startMs = new Date(startIso).getTime();
  const title = normalizeTitle(google.summary);
  const location = (google.location ?? "").trim().toLowerCase();

  const possible = candidates.filter((c) => {
    const delta = Math.abs(c.startsAt.getTime() - startMs);
    if (delta > 15 * 60 * 1000) return false;
    if (!title || normalizeTitle(c.title) !== title) return false;
    return true;
  });

  if (possible.length === 1) {
    const only = possible[0];
    // Exact title+time with no competing candidate — still REVIEW unless location also matches or empty.
    if (!location) {
      return {
        status: "REVIEW_POSSIBLE_MATCH",
        matchedEventId: only.eventId,
        reasons: ["exact_title_and_time_location_unknown"],
      };
    }
    return {
      status: "REVIEW_POSSIBLE_MATCH",
      matchedEventId: only.eventId,
      reasons: ["exact_title_and_time"],
    };
  }
  if (possible.length > 1) {
    return { status: "SOURCE_CONFLICT", reasons: ["competing_title_time_candidates"] };
  }
  return { status: "NO_MATCH", reasons: ["no_evidence_match"] };
}
