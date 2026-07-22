/** Canonical operator path for the full event sheet (view + edit + mutate). */
export function eventSheetHref(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}`;
}
