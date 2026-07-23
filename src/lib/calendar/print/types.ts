/**
 * CC-12 print projection types — presentation only; never mutate Events.
 */

export type PrintProfile =
  | "DAY_OPERATIONS_REDACTED"
  | "INTERNAL_DAY_DETAIL"
  | "WEEK_OVERVIEW";

export const PRINT_PROFILES: readonly PrintProfile[] = [
  "DAY_OPERATIONS_REDACTED",
  "INTERNAL_DAY_DETAIL",
  "WEEK_OVERVIEW",
] as const;

export type PrintEventRow = {
  eventId: string;
  eventNumber: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  isAllDay: boolean;
  isOvernight?: boolean;
  continuesFromPrior?: boolean;
  continuesIntoNext?: boolean;
  status: string;
  locationLabel?: string;
  calendarName?: string;
  missionLinked?: boolean;
  conflictIndicator?: boolean;
  availabilityIndicator?: boolean;
};

export type PrintDayProjection = {
  dateKey: string;
  profile: PrintProfile;
  timezone: string;
  events: PrintEventRow[];
  truncated: boolean;
};

export type PrintWeekDayBucket = {
  dateKey: string;
  events: PrintEventRow[];
};

export type PrintWeekProjection = {
  dateKey: string;
  weekKeys: string[];
  profile: "WEEK_OVERVIEW";
  timezone: string;
  days: PrintWeekDayBucket[];
  truncated: boolean;
};

export type PrintAgendaProjection = {
  dateFrom: string;
  dateTo: string;
  profile: PrintProfile;
  timezone: string;
  events: PrintEventRow[];
  truncated: boolean;
};

export function isPrintProfile(value: unknown): value is PrintProfile {
  return (
    typeof value === "string" &&
    (PRINT_PROFILES as readonly string[]).includes(value)
  );
}
