/** Soft examination cap — report truncation when hit. */
export const MAX_EVENTS_EXAMINED = 2500;

/** Soft findings cap per health run. */
export const MAX_FINDINGS_PER_RUN = 500;

/** Wall-clock soft limit for a single health run (ms). */
export const MAX_RUN_MS = 55_000;

/** Exclusive lease duration for scheduled/manual runs (ms). */
export const LEASE_MS = 60_000;

/** Lightweight health result freshness window (30 minutes). */
export const LIGHTWEIGHT_FRESHNESS_MS = 30 * 60 * 1000;

/** Full health result freshness window (24 hours). */
export const FULL_FRESHNESS_MS = 24 * 60 * 60 * 1000;
