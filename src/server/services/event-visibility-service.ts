import "server-only";

import type { Event, Calendar } from "@prisma/client";
import type { EventVisibilityLevel, LocationDisclosure } from "@prisma/client";

export type SafeEventProjection = {
  eventId: string;
  eventNumber: string;
  primaryCalendar: {
    id: string;
    name: string;
    type: string;
  };
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  allDay: boolean;
  status: string;
  location?: {
    disclosure: string;
    label: string;
  };
  visibilityLevel: string;
  canOpen: boolean;
  capabilities: Record<string, boolean>;
  protectedSectionsOmitted: string[];
};

type ViewerAccess =
  | "NO_ACCESS"
  | "AVAILABILITY_ONLY"
  | "VIEW_LIMITED"
  | "VIEW_FULL"
  | "FULL";

function locationLabel(
  event: Event,
  disclosure: LocationDisclosure,
): string | undefined {
  switch (disclosure) {
    case "HIDDEN":
      return undefined;
    case "REGION":
      return event.city ? `${event.city}, ${event.state}` : undefined;
    case "COUNTY":
      return event.city ? `${event.city}, ${event.state}` : undefined;
    case "CITY":
      return event.city ? `${event.city}, ${event.state}` : undefined;
    case "VENUE":
      return event.venueName
        ? event.city
          ? `${event.venueName}, ${event.city}, ${event.state}`
          : event.venueName
        : event.city
          ? `${event.city}, ${event.state}`
          : undefined;
    case "EXACT":
      return [event.venueName, event.streetAddress, event.city, event.state]
        .filter(Boolean)
        .join(", ");
    default:
      return event.city ? `${event.city}, ${event.state}` : undefined;
  }
}

/**
 * Pure projection helper — does not load unauthorized sections.
 * Live authorization resolution is Step 4; this enforces limited defaults.
 */
export function projectSafeEvent(input: {
  event: Event;
  calendar: Calendar;
  viewerAccess: ViewerAccess;
}): SafeEventProjection | null {
  const { event, calendar, viewerAccess } = input;
  if (viewerAccess === "NO_ACCESS") return null;

  const isPersonal = calendar.calendarType === "PROTECTED_PERSONAL";
  const limited =
    viewerAccess === "AVAILABILITY_ONLY" ||
    viewerAccess === "VIEW_LIMITED" ||
    isPersonal;

  const visibilityLevel: EventVisibilityLevel = limited
    ? isPersonal
      ? "BUSY_ONLY"
      : "TITLE_LOCATION"
    : "FULL";

  const title =
    visibilityLevel === "BUSY_ONLY"
      ? event.restrictedDisplayTitle || "Unavailable"
      : event.campaignDisplayTitle || event.restrictedDisplayTitle || event.internalTitle;

  const disclosure: LocationDisclosure =
    visibilityLevel === "BUSY_ONLY"
      ? "HIDDEN"
      : limited
        ? event.locationDisclosure === "EXACT"
          ? "CITY"
          : event.locationDisclosure
        : event.locationDisclosure;

  const loc = locationLabel(event, disclosure);
  const projection: SafeEventProjection = {
    eventId: event.id,
    eventNumber: event.eventNumber,
    primaryCalendar: {
      id: calendar.id,
      name: calendar.name,
      type: calendar.calendarType,
    },
    title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    allDay: event.isAllDay,
    status: event.status,
    visibilityLevel,
    canOpen: !limited,
    capabilities: {
      canViewNotes: !limited,
      canViewTravel: !limited,
      canViewFiles: !limited,
      canViewCommunications: !limited,
      canViewFundraising: !limited,
    },
    protectedSectionsOmitted: limited
      ? [
          "PRIVATE_NOTES",
          "PARTICIPANTS",
          "TRAVEL",
          "FILES",
          "FUNDRAISING",
          "SECURITY",
          "AI_SUGGESTIONS",
          "AUDIT",
        ]
      : [],
  };

  if (loc) {
    projection.location = { disclosure, label: loc };
  }

  return projection;
}
