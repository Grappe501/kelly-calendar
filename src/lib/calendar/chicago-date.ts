const TIMEZONE = "America/Chicago";

export function chicagoDateKey(iso: string | Date, timeZone = TIMEZONE): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function chicagoTodayKey(now = new Date()): string {
  return chicagoDateKey(now);
}

/** Accept YYYY-MM-DD or fall back to Chicago today. */
export function resolveCalendarDateKey(raw: string | undefined | null, now = new Date()): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return chicagoTodayKey(now);
}

export function shiftChicagoDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(utc);
}

export const CAMPAIGN_CALENDAR_TIMEZONE = TIMEZONE;
