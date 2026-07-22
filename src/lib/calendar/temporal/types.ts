/**
 * CC-03 Calendar temporal doctrine — shared types (pure).
 * Build: KCCC-CC-03-TIMEZONE-ALLDAY-OVERNIGHT-HARDENING-1.0
 */

export const CAMPAIGN_TIMEZONE = "America/Chicago" as const;
export const TEMPORAL_DOCTRINE_VERSION = "CC-03-TEMPORAL-1.0" as const;

export type TemporalClassification =
  | "VALID_TIMED"
  | "VALID_ALL_DAY"
  | "VALID_OVERNIGHT"
  | "VALID_MULTI_DAY"
  | "MISSING_TIMEZONE"
  | "INVALID_RANGE"
  | "SUSPECTED_MIDNIGHT_AS_ALL_DAY"
  | "AMBIGUOUS_LEGACY_TIMEZONE"
  | "REQUIRES_OPERATOR_REVIEW";

export type DayMembershipKind =
  | "starts"
  | "continues"
  | "ends"
  | "spans"
  | "all_day";

export type WallTimeResolveResult =
  | { ok: true; instant: Date; offsetMinutes: number; ambiguous: false }
  | {
      ok: true;
      instant: Date;
      offsetMinutes: number;
      ambiguous: true;
      alternatives: Array<{ instant: Date; offsetMinutes: number; label: string }>;
    }
  | { ok: false; code: "NONEXISTENT" | "INVALID_TIMEZONE" | "INVALID_INPUT"; message: string };

export type DstDisambiguation = "EARLIER" | "LATER";

export type TimedRangeInput = {
  startDateKey: string;
  startTime: string; // HH:mm
  endDateKey: string;
  endTime: string;
  timezone: string;
  disambiguation?: DstDisambiguation;
};

export type AllDayRangeInput = {
  /** Inclusive start date YYYY-MM-DD */
  startDateKey: string;
  /** Inclusive last occupied date YYYY-MM-DD */
  endDateKeyInclusive: string;
  timezone?: string;
};
