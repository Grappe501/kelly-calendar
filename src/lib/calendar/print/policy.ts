/**
 * CC-12 print privacy policy — never emit streetAddress, privateNotes,
 * feed tokens, or contacts. INTERNAL_DAY_DETAIL still excludes street/tokens.
 */

import type { PrintEventRow, PrintProfile } from "@/lib/calendar/print/types";

export type PrintPolicyEventInput = {
  eventId: string;
  eventNumber: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  isAllDay: boolean;
  status: string;
  city?: string | null;
  state?: string | null;
  streetAddress?: string | null;
  venueName?: string | null;
  privateNotes?: string | null;
  feedToken?: string | null;
  contacts?: unknown;
  calendarName?: string | null;
  missionLinked?: boolean;
  conflictIndicator?: boolean;
  availabilityIndicator?: boolean;
  isOvernight?: boolean;
  continuesFromPrior?: boolean;
  continuesIntoNext?: boolean;
  outcomeReviewLabel?: string;
};

function cityOnlyLabel(event: PrintPolicyEventInput): string | undefined {
  const city = event.city?.trim();
  const state = event.state?.trim();
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return undefined;
}

/**
 * Venue + city for internal sheets. Never includes streetAddress even when present.
 * Residential venues fall back to city-only.
 */
function internalLocationLabel(event: PrintPolicyEventInput): string | undefined {
  const city = cityOnlyLabel(event);
  const venue = event.venueName?.trim();
  if (!venue) return city;
  if (
    /\b(home|house|residence|residential|apartment|apt\.?|condo|private\s+home)\b/i.test(
      venue,
    )
  ) {
    return city;
  }
  if (city) return `${venue}, ${city}`;
  return venue;
}

/**
 * Apply print privacy profile. Input may contain sensitive raw fields; output never does.
 */
export function applyPrintPrivacy(
  profile: PrintProfile,
  event: PrintPolicyEventInput,
): PrintEventRow {
  const base: PrintEventRow = {
    eventId: event.eventId,
    eventNumber: event.eventNumber,
    title: event.title?.trim() || "Event",
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    isAllDay: Boolean(event.isAllDay),
    status: event.status,
  };

  if (event.isOvernight != null) base.isOvernight = event.isOvernight;
  if (event.continuesFromPrior != null) {
    base.continuesFromPrior = event.continuesFromPrior;
  }
  if (event.continuesIntoNext != null) {
    base.continuesIntoNext = event.continuesIntoNext;
  }
  if (event.outcomeReviewLabel) {
    base.outcomeReviewLabel = event.outcomeReviewLabel;
  }

  if (profile === "WEEK_OVERVIEW") {
    const city = cityOnlyLabel(event);
    if (city) base.locationLabel = city;
    return base;
  }

  if (profile === "DAY_OPERATIONS_REDACTED") {
    const city = cityOnlyLabel(event);
    if (city) base.locationLabel = city;
    return base;
  }

  // INTERNAL_DAY_DETAIL — elevated ops detail; still no street / tokens / notes / contacts
  const loc = internalLocationLabel(event);
  if (loc) base.locationLabel = loc;
  if (event.calendarName?.trim()) base.calendarName = event.calendarName.trim();
  if (event.missionLinked != null) base.missionLinked = event.missionLinked;
  if (event.conflictIndicator != null) {
    base.conflictIndicator = event.conflictIndicator;
  }
  if (event.availabilityIndicator != null) {
    base.availabilityIndicator = event.availabilityIndicator;
  }
  return base;
}

/** Test/helper: serialized print row must not leak forbidden fields. */
export function assertPrintRowPrivacy(row: PrintEventRow): void {
  const blob = JSON.stringify(row);
  if (/privateNotes/i.test(blob)) {
    throw new Error("Print row must not include privateNotes");
  }
  if (/"streetAddress"\s*:/i.test(blob)) {
    throw new Error("Print row must not include streetAddress");
  }
  if (/feedToken/i.test(blob) || /"contacts"\s*:/i.test(blob)) {
    throw new Error("Print row must not include feed tokens or contacts");
  }
  const loc = row.locationLabel ?? "";
  if (
    /\d{1,6}\s+\w+/.test(loc) &&
    /\b(st|street|ave|avenue|rd|road|ln|lane|dr|drive|blvd)\b/i.test(loc)
  ) {
    throw new Error("Print locationLabel must not include street address text");
  }
}
