import type {
  CalendarContext,
  EventContext,
  ViewerContext,
} from "@/lib/calendar-security/calendar-access-types";
import { resolveDisplayTitle } from "@/lib/calendar-security/event-title-policy";
import {
  resolveLocationLabel,
  type LocationDisclosureLevel,
} from "@/lib/calendar-security/location-disclosure";
import type { SafeCalendarEventView } from "@/lib/calendar-security/safe-event-view";
import type { VisibilityLevel } from "@/lib/calendar-security/visibility-levels";

export type SanitizeInput = {
  viewer: ViewerContext;
  calendar: CalendarContext;
  event: EventContext;
  visibilityLevel: Exclude<VisibilityLevel, "HIDDEN_FROM_UNAUTHENTICATED">;
  locationDisclosure: LocationDisclosureLevel;
};

function titleAudienceFor(
  level: SanitizeInput["visibilityLevel"],
): "full" | "campaign_limited" | "busy_category" | "public" | "busy_only" {
  switch (level) {
    case "FULL":
      return "full";
    case "PUBLIC":
      return "public";
    case "BUSY_ONLY":
      return "busy_only";
    case "BUSY_WITH_CATEGORY":
      return "busy_category";
    case "LIMITED":
    case "TITLE_LOCATION":
    default:
      return "campaign_limited";
  }
}

/**
 * Build SafeCalendarEventView. Protected source fields are never copied onto the result.
 */
export function sanitizeEventForViewer(input: SanitizeInput): SafeCalendarEventView {
  const { calendar, event, visibilityLevel, locationDisclosure } = input;
  const isFull = visibilityLevel === "FULL";
  const canEdit =
    isFull &&
    ["EDIT", "MANAGE", "ADMINISTER"].includes(
      String(input.viewer.calendarPermissions[calendar.id] ?? ""),
    );

  const title = resolveDisplayTitle(
    {
      internalTitle: event.internalTitle,
      campaignDisplayTitle: event.campaignDisplayTitle,
      restrictedDisplayTitle: event.restrictedDisplayTitle,
      publicTitle: event.publicTitle,
      sensitivity: event.sensitivity,
    },
    titleAudienceFor(visibilityLevel),
    calendar.name,
  );

  const locationLabel =
    visibilityLevel === "BUSY_ONLY"
      ? undefined
      : resolveLocationLabel(event.location, locationDisclosure);

  const view: SafeCalendarEventView = {
    eventId: event.id,
    calendarId: calendar.id,
    calendarName: calendar.name,
    calendarType: calendar.type,
    visibilityLevel,
    title:
      visibilityLevel === "BUSY_ONLY"
        ? event.restrictedDisplayTitle?.trim() || "Unavailable"
        : title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: Boolean(event.allDay),
    status: event.status ?? "CONFIRMED",
    canOpen: isFull,
    canEdit,
    canViewPeople: isFull,
    canViewNotes: isFull,
    canViewTravelDetails: isFull,
    canViewFiles: isFull,
    canViewCommunications: isFull,
    protectedFieldsOmitted: !isFull,
    limitedAccessLabel: isFull
      ? undefined
      : "Limited access — protected details are not available",
  };

  if (locationLabel) {
    view.locationLabel = locationLabel;
  }

  // Explicitly ensure sensitive source keys never appear on the outbound object
  const forbidden = [
    "privateNotes",
    "donorNames",
    "hostPhone",
    "attachmentIds",
    "exactAddress",
    "internalTitle",
  ];
  for (const key of forbidden) {
    if (key in view) {
      delete (view as Record<string, unknown>)[key];
    }
  }

  return view;
}
