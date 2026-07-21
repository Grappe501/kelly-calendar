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

/** Monday-start week containing dateKey (America/Chicago calendar date). */
export function startOfWeekDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // getUTCDay: 0 Sun … 6 Sat → Monday-based offset
  const day = utc.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return shiftChicagoDateKey(dateKey, mondayOffset);
}

export function weekDateKeys(dateKey: string): string[] {
  const start = startOfWeekDateKey(dateKey);
  return Array.from({ length: 7 }, (_, i) => shiftChicagoDateKey(start, i));
}

/**
 * Display-only campaign week index from a floor date.
 * Not a canonical registry — presentation aid for Week header.
 */
export function displayCampaignWeekIndex(
  dateKey: string,
  floorDateKey = "2025-11-01",
): number {
  const [fy, fm, fd] = floorDateKey.split("-").map(Number);
  const [y, m, d] = dateKey.split("-").map(Number);
  const floor = Date.UTC(fy, fm - 1, fd);
  const current = Date.UTC(y, m - 1, d);
  const diffDays = Math.floor((current - floor) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return 0;
  return Math.floor(diffDays / 7) + 1;
}

export function formatWeekRangeLabel(weekKeys: string[]): string {
  if (weekKeys.length === 0) return "";
  const start = weekKeys[0];
  const end = weekKeys[weekKeys.length - 1];
  const fmt = (key: string, opts: Intl.DateTimeFormatOptions) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(
      new Date(Date.UTC(y, m - 1, d, 12, 0, 0)),
    );
  };
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  if (sameMonth) {
    return `${fmt(start, { month: "long", day: "numeric" })}–${fmt(end, { day: "numeric" })}`;
  }
  return `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric" })}`;
}

export function startOfMonthDateKey(dateKey: string): string {
  return `${dateKey.slice(0, 7)}-01`;
}

export function daysInMonthForDateKey(dateKey: string): number {
  const [y, m] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** All YYYY-MM-DD keys in the calendar month containing dateKey. */
export function monthDateKeys(dateKey: string): string[] {
  const start = startOfMonthDateKey(dateKey);
  const count = daysInMonthForDateKey(dateKey);
  return Array.from({ length: count }, (_, i) => shiftChicagoDateKey(start, i));
}

/**
 * Monday-start traditional month grid (leading/trailing days from adjacent months).
 */
export function monthGridDateKeys(dateKey: string): string[] {
  const inMonth = monthDateKeys(dateKey);
  const first = inMonth[0];
  const last = inMonth[inMonth.length - 1];
  const gridStart = startOfWeekDateKey(first);
  const lastWeekStart = startOfWeekDateKey(last);
  const gridEnd = shiftChicagoDateKey(lastWeekStart, 6);
  const keys: string[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    keys.push(cursor);
    cursor = shiftChicagoDateKey(cursor, 1);
  }
  return keys;
}

export function formatMonthLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)));
}

/** Shift by whole months, clamping day into the target month. */
export function shiftMonthDateKey(dateKey: string, deltaMonths: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + deltaMonths, 1, 12, 0, 0));
  const dim = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const day = Math.min(d, dim);
  const yy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export const CAMPAIGN_CALENDAR_TIMEZONE = TIMEZONE;

/**
 * UTC bounds for a Chicago calendar date [start, endExclusive).
 * Picks CST/CDT offset so chicagoDateKey(start) === dateKey.
 */
export function chicagoDateKeyToUtcBounds(dateKey: string): {
  start: Date;
  endExclusive: Date;
} {
  const candidates = [
    new Date(`${dateKey}T00:00:00-05:00`),
    new Date(`${dateKey}T00:00:00-06:00`),
  ];
  const start =
    candidates.find((d) => chicagoDateKey(d) === dateKey) ?? candidates[1];
  const nextKey = shiftChicagoDateKey(dateKey, 1);
  const nextCandidates = [
    new Date(`${nextKey}T00:00:00-05:00`),
    new Date(`${nextKey}T00:00:00-06:00`),
  ];
  const endExclusive =
    nextCandidates.find((d) => chicagoDateKey(d) === nextKey) ??
    nextCandidates[1];
  return { start, endExclusive };
}

/** Inclusive Chicago date range → UTC query window overlapping those days. */
export function chicagoDateKeysToUtcRange(
  firstKey: string,
  lastKeyInclusive: string,
): { rangeStart: Date; rangeEnd: Date } {
  const { start } = chicagoDateKeyToUtcBounds(firstKey);
  const { endExclusive } = chicagoDateKeyToUtcBounds(lastKeyInclusive);
  return { rangeStart: start, rangeEnd: endExclusive };
}
