import type {
  CalendarContext,
  EventContext,
  ViewerContext,
} from "@/lib/calendar-security/calendar-access-types";
import {
  CALENDAR_TYPE_DEFAULTS,
  GLOBAL_VISIBILITY_POLICY,
} from "@/lib/calendar-security/event-visibility-policy";
import {
  isLocationDisclosureLevel,
  type LocationDisclosureLevel,
} from "@/lib/calendar-security/location-disclosure";
import type { SafeCalendarEventView } from "@/lib/calendar-security/safe-event-view";
import {
  isVisibilityLevel,
  type VisibilityLevel,
} from "@/lib/calendar-security/visibility-levels";
import { sanitizeEventForViewer } from "@/lib/calendar-security/sanitize-event-for-viewer";

export type VisibilityResolutionInput = {
  viewer: ViewerContext;
  calendar: CalendarContext;
  event: EventContext;
};

export type VisibilityResolutionResult =
  | { visible: true; view: SafeCalendarEventView }
  | { visible: false; reason: "unauthenticated_hidden" | "no_access" };

function permissionRank(permission: string | undefined): number {
  switch (permission) {
    case "ADMINISTER":
      return 60;
    case "MANAGE":
      return 50;
    case "EDIT":
      return 40;
    case "CONTRIBUTE":
      return 30;
    case "VIEW":
      return 20;
    case "AVAILABILITY_ONLY":
      return 10;
    default:
      return 0;
  }
}

type DeliverableVisibility = Exclude<
  VisibilityLevel,
  "HIDDEN_FROM_UNAUTHENTICATED"
>;

function asDeliverable(level: VisibilityLevel): DeliverableVisibility | "HIDDEN" {
  if (level === "HIDDEN_FROM_UNAUTHENTICATED") return "HIDDEN";
  return level;
}

function resolveBaseLevel(
  viewer: ViewerContext,
  calendar: CalendarContext,
  event: EventContext,
): DeliverableVisibility | "HIDDEN" {
  if (!viewer.authenticated) {
    const typeDefault = CALENDAR_TYPE_DEFAULTS[calendar.type];
    const publicDefault =
      typeDefault?.publicDefault ??
      GLOBAL_VISIBILITY_POLICY.defaultUnauthenticatedVisibility;
    if (publicDefault === "HIDDEN_FROM_UNAUTHENTICATED") return "HIDDEN";
    if (publicDefault === "PUBLIC") return "PUBLIC";
    return "HIDDEN";
  }

  const permission = viewer.calendarPermissions[calendar.id];
  if (!permission || permission === "NO_ACCESS") {
    // Authenticated campaign users still see limited occupied blocks by default
    // unless explicitly denied at system level later.
    return asDeliverable(
      GLOBAL_VISIBILITY_POLICY.defaultAuthenticatedCampaignVisibility,
    );
  }

  // VIEW+ may open authorized details; protected personal stays busy-only unless manage+
  if (permissionRank(permission) >= 20) {
    if (event.sensitivity === "PROTECTED_PERSONAL") {
      return permissionRank(permission) >= 50
        ? "FULL"
        : asDeliverable(GLOBAL_VISIBILITY_POLICY.protectedPersonalFallback);
    }
    return "FULL";
  }

  if (permission === "AVAILABILITY_ONLY") {
    if (event.sensitivity === "PROTECTED_PERSONAL") return "BUSY_ONLY";
    if (
      event.sensitivity === "SECURITY_SENSITIVE" ||
      event.sensitivity === "FUNDRAISING_SENSITIVE"
    ) {
      // Still show calendar + safe title + general location (not busy-only)
      return "TITLE_LOCATION";
    }
    return "TITLE_LOCATION";
  }

  const calendarDefault = isVisibilityLevel(calendar.defaultVisibility)
    ? calendar.defaultVisibility
    : GLOBAL_VISIBILITY_POLICY.defaultAuthenticatedCampaignVisibility;

  if (event.visibilityOverride && isVisibilityLevel(event.visibilityOverride)) {
    return asDeliverable(event.visibilityOverride);
  }

  if (event.sensitivity === "PROTECTED_PERSONAL") {
    return asDeliverable(GLOBAL_VISIBILITY_POLICY.protectedPersonalFallback);
  }
  if (
    event.sensitivity === "SECURITY_SENSITIVE" ||
    event.sensitivity === "FUNDRAISING_SENSITIVE"
  ) {
    return asDeliverable(GLOBAL_VISIBILITY_POLICY.highSensitivityFallback);
  }

  return asDeliverable(
    calendarDefault === "HIDDEN_FROM_UNAUTHENTICATED"
      ? "TITLE_LOCATION"
      : calendarDefault,
  );
}

function resolveDisclosure(
  calendar: CalendarContext,
  level: DeliverableVisibility,
): LocationDisclosureLevel {
  if (level === "BUSY_ONLY") return "HIDDEN";
  if (level === "FULL") {
    return isLocationDisclosureLevel(calendar.locationDisclosure)
      ? calendar.locationDisclosure
      : "VENUE";
  }
  const typeDefault = CALENDAR_TYPE_DEFAULTS[calendar.type];
  const fromCalendar = isLocationDisclosureLevel(calendar.locationDisclosure)
    ? calendar.locationDisclosure
    : undefined;
  const preferred =
    fromCalendar ?? typeDefault?.locationDefault ?? GLOBAL_VISIBILITY_POLICY.locationDefault;
  if (preferred === "EXACT") return "CITY";
  return preferred;
}

/**
 * Pure visibility resolver — fixtures only in Step 3; no live DB.
 * Unauthorized fields are omitted, never null-filled.
 */
export function resolveEventVisibility(
  input: VisibilityResolutionInput,
): VisibilityResolutionResult {
  const level = resolveBaseLevel(input.viewer, input.calendar, input.event);
  if (level === "HIDDEN") {
    return { visible: false, reason: "unauthenticated_hidden" };
  }

  const disclosure = resolveDisclosure(input.calendar, level);
  const view = sanitizeEventForViewer({
    viewer: input.viewer,
    calendar: input.calendar,
    event: input.event,
    visibilityLevel: level,
    locationDisclosure: disclosure,
  });

  return { visible: true, view };
}
