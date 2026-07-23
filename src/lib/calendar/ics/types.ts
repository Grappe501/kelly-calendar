/**
 * CC-10 ICS export & subscription — pure projection types and shared constants.
 * Authorized export fields only; never privateNotes, streetAddress, or mission ops.
 */

export type IcsPrivacyProfile =
  | "BUSY_ONLY"
  | "CITY_ONLY"
  | "OPERATIONAL_REDACTED";

export type IcsFeedStatus = "ACTIVE" | "REVOKED" | "EXPIRED" | "DISABLED";

export type IcsScopeType =
  | "DATE_RANGE"
  | "RELATIVE_WINDOW"
  | "SAVED_VIEW"
  | "CANONICAL_QUERY";

/** Already-authorized event projection for ICS serialization. */
export type IcsExportProjection = {
  eventId: string;
  eventNumber: string;
  uid: string;
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  isAllDay: boolean;
  status: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  recurrenceRule?: string;
  recurrenceId?: string;
  exdates?: string[];
  rdates?: string[];
  isCancelled: boolean;
};

export type IcsCalendarDocument = {
  prodId?: string;
  calendarName?: string;
  method?: string;
  events: IcsExportProjection[];
};

export const ICS_PRODID = "-//Kelly Campaign Command Calendar//CC-10//EN";
export const ICS_DOMAIN = "kelly-calendar.netlify.app";

export {
  MAX_FEED_EVENTS,
  MAX_FUTURE_DAYS,
  MAX_ONE_TIME_RANGE_DAYS,
  MAX_PAST_DAYS,
} from "@/lib/calendar/ics/bounds";
