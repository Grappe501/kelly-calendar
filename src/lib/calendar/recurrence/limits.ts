/**
 * CC-04 recurrence limits and constants.
 * Build: KCCC-CC-04-RECURRENCE-OCCURRENCE-EXCEPTIONS-1.0
 */

export const RECURRENCE_DOCTRINE_VERSION = "CC-04-RECURRENCE-1.0" as const;

/** Preview before save — operator-facing. */
export const MAX_PREVIEW_OCCURRENCES = 52;

/** Synchronous materialization horizon per create/edit. */
export const MAX_MATERIALIZE_OCCURRENCES = 52;

/** Maximum calendar span for a single expansion window. */
export const MAX_EXPANSION_RANGE_DAYS = 400;

/** Soft application horizon when rule has neither COUNT nor UNTIL. */
export const DEFAULT_HORIZON_DAYS = 90;

/** Reject COUNT above this without explicit multi-step materialization. */
export const MAX_COUNT = 104;

/** Guardrail for rrule iteration. */
export const MAX_RULE_COMPUTE_MS = 2_000;

export const SUPPORTED_FREQ = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

export type SupportedFreq = (typeof SUPPORTED_FREQ)[number];

export type OccurrenceLifecycle =
  | "GENERATED"
  | "MATERIALIZED"
  | "MODIFIED"
  | "CANCELLED"
  | "EXCLUDED"
  | "DETACHED"
  | "REQUIRES_REVIEW";

export type EditScope = "this" | "this_and_future" | "series";
