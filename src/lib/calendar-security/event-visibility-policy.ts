import type { VisibilityLevel } from "@/lib/calendar-security/visibility-levels";
import type { LocationDisclosureLevel } from "@/lib/calendar-security/location-disclosure";

export type CalendarTypeDefault = {
  authenticatedDefault: VisibilityLevel;
  publicDefault: VisibilityLevel;
  locationDefault: LocationDisclosureLevel;
};

/** Initial policy defaults by calendar type (fixtures / future seed). */
export const CALENDAR_TYPE_DEFAULTS: Record<string, CalendarTypeDefault> = {
  candidate_schedule: {
    authenticatedDefault: "TITLE_LOCATION",
    publicDefault: "HIDDEN_FROM_UNAUTHENTICATED",
    locationDefault: "CITY",
  },
  travel: {
    authenticatedDefault: "TITLE_LOCATION",
    publicDefault: "HIDDEN_FROM_UNAUTHENTICATED",
    locationDefault: "CITY",
  },
  fundraising: {
    authenticatedDefault: "TITLE_LOCATION",
    publicDefault: "HIDDEN_FROM_UNAUTHENTICATED",
    locationDefault: "CITY",
  },
  public_events: {
    authenticatedDefault: "TITLE_LOCATION",
    publicDefault: "PUBLIC",
    locationDefault: "VENUE",
  },
  communications: {
    authenticatedDefault: "TITLE_LOCATION",
    publicDefault: "HIDDEN_FROM_UNAUTHENTICATED",
    locationDefault: "CITY",
  },
  social_media: {
    authenticatedDefault: "TITLE_LOCATION",
    publicDefault: "HIDDEN_FROM_UNAUTHENTICATED",
    locationDefault: "CITY",
  },
  staff_work: {
    authenticatedDefault: "BUSY_WITH_CATEGORY",
    publicDefault: "HIDDEN_FROM_UNAUTHENTICATED",
    locationDefault: "HIDDEN",
  },
  compliance: {
    authenticatedDefault: "TITLE_LOCATION",
    publicDefault: "HIDDEN_FROM_UNAUTHENTICATED",
    locationDefault: "CITY",
  },
  protected_personal: {
    authenticatedDefault: "BUSY_ONLY",
    publicDefault: "HIDDEN_FROM_UNAUTHENTICATED",
    locationDefault: "HIDDEN",
  },
};

export const GLOBAL_VISIBILITY_POLICY = {
  version: "1.0",
  defaultAuthenticatedCampaignVisibility: "TITLE_LOCATION" as VisibilityLevel,
  defaultUnauthenticatedVisibility: "HIDDEN_FROM_UNAUTHENTICATED" as VisibilityLevel,
  showCalendarName: true,
  showSafeEventTitle: true,
  showGeneralLocationWhenAvailable: true,
  showStartAndEnd: true,
  deliverProtectedFieldsToClient: false,
  locationDefault: "CITY" as LocationDisclosureLevel,
  highSensitivityFallback: "BUSY_WITH_CATEGORY" as VisibilityLevel,
  protectedPersonalFallback: "BUSY_ONLY" as VisibilityLevel,
};
