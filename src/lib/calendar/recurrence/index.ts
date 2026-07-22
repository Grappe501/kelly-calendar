/**
 * CC-04 recurrence surface.
 */

export {
  RECURRENCE_DOCTRINE_VERSION,
  MAX_PREVIEW_OCCURRENCES,
  MAX_MATERIALIZE_OCCURRENCES,
  MAX_EXPANSION_RANGE_DAYS,
  DEFAULT_HORIZON_DAYS,
  MAX_COUNT,
  MAX_RULE_COMPUTE_MS,
  SUPPORTED_FREQ,
  type SupportedFreq,
  type OccurrenceLifecycle,
  type EditScope,
} from "@/lib/calendar/recurrence/limits";

export {
  buildOccurrenceKey,
  buildRuleFingerprint,
} from "@/lib/calendar/recurrence/occurrence-key";

export {
  parseRecurrenceRule,
  summarizeRule,
  RRule,
  Frequency,
  type ParsedRecurrenceRule,
} from "@/lib/calendar/recurrence/parse-rrule";

export {
  expandRecurrenceOccurrences,
  type ExpandedOccurrence,
  type ExpansionResult,
} from "@/lib/calendar/recurrence/expand";
