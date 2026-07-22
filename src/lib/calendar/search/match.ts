/**
 * CC-07 Unified Search — authorized search blob + free-text matching.
 *
 * Hard rule: callers build the blob only from fields the viewer is already
 * entitled to see (per `projectSafeEvent` / `canAccessEvent`). This module
 * never widens visibility — `privateNotes` is only included when the caller
 * asserts `viewerHasFullNotesAccess`, and NO_ACCESS events must already be
 * dropped before anything here runs (a caller passing a blob at all implies
 * the event is visible to the viewer).
 */

import { extractSnippet, rankMatch, tokenizeSearchQuery } from "@/lib/calendar/search/normalize";
import type { CalendarQueryContract, SearchMatchExplanation } from "@/lib/calendar/search/types";

export type SearchBlobPart = {
  /** Stable machine-readable field tag, e.g. "title", "person", "tag". */
  field: string;
  /** Human-readable label for the field, e.g. "Title", "Person". */
  label: string;
  value: string;
};

/**
 * Fields the viewer is authorized to see for this event. `privateNotes`
 * must only be populated by the caller when `viewerHasFullNotesAccess`.
 */
export type SearchableEventFields = {
  title: string;
  locationLabel?: string | null;
  calendarName?: string | null;
  countyName?: string | null;
  organizationNames?: string[];
  peopleNames?: string[];
  tags?: string[];
  eventType?: string | null;
  eventSubtype?: string | null;
  status?: string | null;
  eventNumber?: string | null;
  /** Only pass this through when the viewer has FULL access to notes. */
  privateNotes?: string | null;
  viewerHasFullNotesAccess: boolean;
};

/**
 * Build the flat list of authorized, taggable text fields for one event.
 * Never includes fields the caller did not explicitly authorize.
 */
export function buildAuthorizedSearchBlob(input: SearchableEventFields): SearchBlobPart[] {
  const parts: SearchBlobPart[] = [];
  const push = (field: string, label: string, value: string | null | undefined) => {
    if (value && value.trim().length > 0) parts.push({ field, label, value });
  };

  push("title", "Title", input.title);
  push("eventNumber", "Event #", input.eventNumber);
  push("location", "Location", input.locationLabel);
  push("calendar", "Calendar", input.calendarName);
  push("county", "County", input.countyName);
  for (const org of input.organizationNames ?? []) push("organization", "Organization", org);
  for (const person of input.peopleNames ?? []) push("person", "Person", person);
  for (const tag of input.tags ?? []) push("tag", "Tag", tag);
  push("eventType", "Type", input.eventType);
  push("eventSubtype", "Subtype", input.eventSubtype);
  push("status", "Status", input.status);

  if (input.viewerHasFullNotesAccess) {
    push("notes", "Notes", input.privateNotes);
  }

  return parts;
}

export type MatchResult = {
  matched: boolean;
  score: number;
  reasons: SearchMatchExplanation[];
};

/**
 * Deterministic AND-of-terms free-text match: every normalized term in
 * `query.q` must match at least one authorized field for the event to
 * match. Score is the sum of each term's best per-field rank. When `q` is
 * empty, every event matches with score 0 (structured filters alone decide
 * inclusion upstream).
 */
export function matchEventAgainstQuery(
  blob: SearchBlobPart[],
  query: Pick<CalendarQueryContract, "q">,
): MatchResult {
  const terms = tokenizeSearchQuery(query.q);
  if (terms.length === 0) {
    return { matched: true, score: 0, reasons: [] };
  }

  const reasons: SearchMatchExplanation[] = [];
  let totalScore = 0;

  for (const term of terms) {
    let bestRank = 0;
    let bestPart: SearchBlobPart | undefined;
    for (const part of blob) {
      const rank = rankMatch(term, part.value);
      if (rank > bestRank) {
        bestRank = rank;
        bestPart = part;
      }
    }
    if (bestRank === 0 || !bestPart) {
      return { matched: false, score: 0, reasons: [] };
    }
    totalScore += bestRank;
    reasons.push({
      field: bestPart.field,
      label: bestPart.label,
      snippet: extractSnippet(term, bestPart.value),
    });
  }

  const deduped: SearchMatchExplanation[] = [];
  const seenKeys = new Set<string>();
  for (const reason of reasons) {
    const key = `${reason.field}:${reason.label}:${reason.snippet ?? ""}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduped.push(reason);
    }
  }

  return { matched: true, score: totalScore, reasons: deduped };
}
