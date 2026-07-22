/**
 * CC-03 authoritative temporal surface.
 * Build: KCCC-CC-03-TIMEZONE-ALLDAY-OVERNIGHT-HARDENING-1.0
 */

export {
  CAMPAIGN_TIMEZONE,
  TEMPORAL_DOCTRINE_VERSION,
  type TemporalClassification,
  type DayMembershipKind,
  type WallTimeResolveResult,
  type DstDisambiguation,
  type TimedRangeInput,
  type AllDayRangeInput,
} from "@/lib/calendar/temporal/types";

export {
  isValidIanaTimeZone,
  dateKeyInTimeZone,
  wallPartsInTimeZone,
  resolveWallTime,
  chicagoWallTimeToUtc,
} from "@/lib/calendar/temporal/wall-time";

export {
  normalizeTimedRange,
  normalizeAllDayRange,
  eventIntersectsCampaignDay,
  occupiedCampaignDateKeysForInterval,
  dayMembershipKind,
  classifyEventTemporal,
  elapsedDurationMinutes,
} from "@/lib/calendar/temporal/ranges";
