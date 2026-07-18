/** Hard limits for Google Calendar historical import (Step 3 staging). */

export const HISTORICAL_IMPORT_FLOOR = "2025-11-01T00:00:00-06:00";
export const HISTORICAL_IMPORT_FLOOR_DATE = "2025-11-01";
export const IMPORT_TIMEZONE = "America/Chicago";

export const IMPORT_LIMITS = {
  maxRedirects: 3,
  requestTimeoutMs: 20_000,
  maxResponseBytes: 8 * 1024 * 1024,
  maxEventsPerImport: 5_000,
  maxRecurrenceInstances: 2_000,
  maxTitleLength: 500,
  maxDescriptionLength: 20_000,
  maxLocationLength: 1_000,
  duplicateStartToleranceMinutes: 15,
} as const;

/** Official Google Calendar delivery hosts only — not a generic URL fetcher. */
export const GOOGLE_ICAL_HOST_ALLOWLIST = [
  "calendar.google.com",
  "www.google.com",
  "calendar.googleusercontent.com",
] as const;
