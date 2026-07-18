import type {
  CalendarContext,
  EventContext,
  ViewerContext,
} from "@/lib/calendar-security/calendar-access-types";
import { resolveEventVisibility } from "@/lib/calendar-security/resolve-event-visibility";
import type { SafeCalendarEventView } from "@/lib/calendar-security/safe-event-view";

const limitedViewer: ViewerContext = {
  authenticated: true,
  systemRole: "staff",
  teamIds: ["comms"],
  calendarPermissions: {
    cal_fundraising: "AVAILABILITY_ONLY",
    cal_travel: "AVAILABILITY_ONLY",
    cal_public: "VIEW",
    cal_personal: "AVAILABILITY_ONLY",
  },
};

const fullViewer: ViewerContext = {
  authenticated: true,
  systemRole: "campaign_manager",
  teamIds: ["leadership"],
  calendarPermissions: {
    cal_fundraising: "MANAGE",
    cal_travel: "MANAGE",
    cal_public: "MANAGE",
    cal_personal: "VIEW",
  },
};

const calendars: Record<string, CalendarContext> = {
  fundraising: {
    id: "cal_fundraising",
    name: "Fundraising",
    type: "fundraising",
    defaultVisibility: "TITLE_LOCATION",
    locationDisclosure: "CITY",
  },
  travel: {
    id: "cal_travel",
    name: "Travel",
    type: "travel",
    defaultVisibility: "TITLE_LOCATION",
    locationDisclosure: "CITY",
  },
  publicEvents: {
    id: "cal_public",
    name: "Public Events",
    type: "public_events",
    defaultVisibility: "TITLE_LOCATION",
    locationDisclosure: "VENUE",
  },
  personal: {
    id: "cal_personal",
    name: "Protected Personal Time",
    type: "protected_personal",
    defaultVisibility: "BUSY_ONLY",
    locationDisclosure: "HIDDEN",
  },
};

const events: EventContext[] = [
  {
    id: "demo_fundraiser",
    internalTitle: "Dinner with John Smith, Jane Doe, and finance committee",
    campaignDisplayTitle: "Women for Kelly Reception",
    restrictedDisplayTitle: "Fundraising Meeting",
    startsAt: "2026-08-18T17:30:00-05:00",
    endsAt: "2026-08-18T19:30:00-05:00",
    status: "CONFIRMED",
    sensitivity: "FUNDRAISING_SENSITIVE",
    location: {
      venue: "The Capital Hotel",
      city: "Little Rock",
      state: "Arkansas",
      exactAddress: "111 Markham St, Little Rock, AR",
    },
    privateNotes: "Discuss major donor ask — DO NOT LEAK",
    donorNames: ["John Smith", "Jane Doe"],
    hostPhone: "555-0100",
  },
  {
    id: "demo_travel",
    internalTitle: "Drive to Jonesboro with Steve — confirmation ABC123",
    campaignDisplayTitle: "Travel to Jonesboro",
    startsAt: "2026-08-18T10:00:00-05:00",
    endsAt: "2026-08-18T12:30:00-05:00",
    status: "CONFIRMED",
    sensitivity: "NORMAL",
    location: {
      city: "Jonesboro",
      state: "Arkansas",
      exactAddress: "Private pickup point",
    },
    privateNotes: "Confirmation ABC123",
  },
  {
    id: "demo_fair",
    internalTitle: "County Fair Appearance",
    campaignDisplayTitle: "County Fair Appearance",
    publicTitle: "Kelly Grappe at Benton County Fair",
    startsAt: "2026-08-18T14:00:00-05:00",
    endsAt: "2026-08-18T16:00:00-05:00",
    status: "CONFIRMED",
    sensitivity: "NORMAL",
    location: {
      venue: "Benton County Fairgrounds",
      city: "Rogers",
      county: "Benton",
      state: "Arkansas",
    },
  },
  {
    id: "demo_personal",
    internalTitle: "Candidate dental appointment at Smith Family Dentistry",
    restrictedDisplayTitle: "Protected Personal Time",
    startsAt: "2026-08-18T14:00:00-05:00",
    endsAt: "2026-08-18T15:30:00-05:00",
    status: "CONFIRMED",
    sensitivity: "PROTECTED_PERSONAL",
    location: {
      venue: "Smith Family Dentistry",
      city: "Little Rock",
      exactAddress: "Room details hidden",
    },
    privateNotes: "Provider name must not appear",
  },
];

function resolveDemo(
  event: EventContext,
  calendar: CalendarContext,
  viewer: ViewerContext,
): SafeCalendarEventView | null {
  const result = resolveEventVisibility({ viewer, calendar, event });
  return result.visible ? result.view : null;
}

export type DemoVisibilityCase = {
  id: string;
  label: string;
  limited: SafeCalendarEventView | null;
  full: SafeCalendarEventView | null;
};

export function getDemoVisibilityCases(): DemoVisibilityCase[] {
  return [
    {
      id: "fundraising",
      label: "Fundraising (limited vs full)",
      limited: resolveDemo(events[0], calendars.fundraising, limitedViewer),
      full: resolveDemo(events[0], calendars.fundraising, fullViewer),
    },
    {
      id: "travel",
      label: "Travel",
      limited: resolveDemo(events[1], calendars.travel, limitedViewer),
      full: resolveDemo(events[1], calendars.travel, fullViewer),
    },
    {
      id: "public",
      label: "Public Events",
      limited: resolveDemo(events[2], calendars.publicEvents, limitedViewer),
      full: resolveDemo(events[2], calendars.publicEvents, fullViewer),
    },
    {
      id: "personal",
      label: "Protected Personal Time",
      limited: resolveDemo(events[3], calendars.personal, limitedViewer),
      full: resolveDemo(events[3], calendars.personal, fullViewer),
    },
  ];
}
