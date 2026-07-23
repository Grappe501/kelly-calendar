import { ICS_DOMAIN } from "@/lib/calendar/ics/types";

/** Stable UID for a canonical event — never embeds tokens, secrets, or PII. */
export function buildStableEventUid(eventId: string): string {
  const id = eventId.trim();
  if (!id) {
    throw new Error("eventId is required for ICS UID");
  }
  return `kccc-event-${id}@${ICS_DOMAIN}`;
}

/** Stable UID for a specific recurrence occurrence. */
export function buildStableOccurrenceUid(
  eventId: string,
  occurrenceKey: string,
): string {
  const id = eventId.trim();
  const occ = occurrenceKey.trim();
  if (!id || !occ) {
    throw new Error("eventId and occurrenceKey are required for occurrence UID");
  }
  return `kccc-event-${id}-${occ}@${ICS_DOMAIN}`;
}
