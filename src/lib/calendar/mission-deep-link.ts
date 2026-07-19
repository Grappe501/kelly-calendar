import { chicagoDateKey } from "@/lib/calendar/chicago-date";

/**
 * Canonical V1 deep-link contract emitted across mission modules:
 *   /calendar?view=day&date=YYYY-MM-DD&event=<eventId>
 *
 * Calendar must consume `event` (HL-039). Pure builders live here for tests.
 */

export function buildMissionCalendarHref(input: {
  eventId: string;
  startsAt: string | Date;
  view?: "day" | "week" | "month";
}): string {
  const date = chicagoDateKey(input.startsAt);
  const view = input.view ?? "day";
  const params = new URLSearchParams({
    view,
    date,
    event: input.eventId,
  });
  return `/calendar?${params.toString()}`;
}

/** Internal relative return path only — blocks open redirects. */
export function sanitizeCalendarReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  if (!trimmed.startsWith("/calendar")) return null;
  return trimmed.slice(0, 512);
}

export function parseCalendarEventParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const id = raw.trim();
  if (!id) return null;
  // cuid / uuid-ish — reject path separators and spaces
  if (!/^[a-zA-Z0-9_-]{4,128}$/.test(id)) return null;
  return id;
}

export type MissionFocusBanner =
  | { kind: "none" }
  | { kind: "focused"; eventId: string; title: string }
  | { kind: "unavailable"; message: string }
  | { kind: "not_found"; message: string }
  | { kind: "forbidden"; message: string };
