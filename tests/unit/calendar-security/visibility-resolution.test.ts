import { describe, expect, it } from "vitest";
import { resolveEventVisibility } from "@/lib/calendar-security/resolve-event-visibility";
import type {
  CalendarContext,
  EventContext,
  ViewerContext,
} from "@/lib/calendar-security/calendar-access-types";

const fundraisingCal: CalendarContext = {
  id: "cal_fundraising",
  name: "Fundraising",
  type: "fundraising",
  defaultVisibility: "TITLE_LOCATION",
  locationDisclosure: "CITY",
};

const personalCal: CalendarContext = {
  id: "cal_personal",
  name: "Protected Personal Time",
  type: "protected_personal",
  defaultVisibility: "BUSY_ONLY",
  locationDisclosure: "HIDDEN",
};

const fundraiser: EventContext = {
  id: "evt_1",
  internalTitle: "Dinner with John Smith and Jane Doe",
  campaignDisplayTitle: "River Valley Reception",
  restrictedDisplayTitle: "Fundraising Meeting",
  startsAt: "2026-08-18T18:00:00-05:00",
  endsAt: "2026-08-18T20:00:00-05:00",
  sensitivity: "FUNDRAISING_SENSITIVE",
  location: {
    venue: "Private home",
    city: "Fort Smith",
    state: "Arkansas",
    exactAddress: "1427 Private Road",
  },
  privateNotes: "Donor ask $25k",
  donorNames: ["John Smith"],
  hostPhone: "555-0199",
};

const personal: EventContext = {
  id: "evt_personal",
  internalTitle: "Medical appointment with provider name",
  restrictedDisplayTitle: "Protected Personal Time",
  startsAt: "2026-08-18T14:00:00-05:00",
  endsAt: "2026-08-18T15:30:00-05:00",
  sensitivity: "PROTECTED_PERSONAL",
  location: { city: "Little Rock", exactAddress: "Clinic room" },
  privateNotes: "provider secret",
};

const limitedViewer: ViewerContext = {
  authenticated: true,
  teamIds: ["comms"],
  calendarPermissions: { cal_fundraising: "AVAILABILITY_ONLY", cal_personal: "AVAILABILITY_ONLY" },
};

const fullViewer: ViewerContext = {
  authenticated: true,
  teamIds: ["leadership"],
  calendarPermissions: { cal_fundraising: "MANAGE", cal_personal: "MANAGE" },
};

describe("resolveEventVisibility", () => {
  it("limited viewers see calendar name, safe title, generalized location, and times", () => {
    const result = resolveEventVisibility({
      viewer: limitedViewer,
      calendar: fundraisingCal,
      event: fundraiser,
    });
    expect(result.visible).toBe(true);
    if (!result.visible) return;
    expect(result.view.calendarName).toBe("Fundraising");
    expect(result.view.title).toBe("River Valley Reception");
    expect(result.view.locationLabel).toBe("Fort Smith, Arkansas");
    expect(result.view.startsAt).toBe(fundraiser.startsAt);
    expect(result.view.endsAt).toBe(fundraiser.endsAt);
    expect(result.view.protectedFieldsOmitted).toBe(true);
    expect(result.view.canOpen).toBe(false);
  });

  it("events remain visible as occupied time for limited viewers", () => {
    const result = resolveEventVisibility({
      viewer: limitedViewer,
      calendar: fundraisingCal,
      event: fundraiser,
    });
    expect(result.visible).toBe(true);
  });

  it("protected personal events use BUSY_ONLY for limited viewers", () => {
    const result = resolveEventVisibility({
      viewer: limitedViewer,
      calendar: personalCal,
      event: personal,
    });
    expect(result.visible).toBe(true);
    if (!result.visible) return;
    expect(result.view.visibilityLevel).toBe("BUSY_ONLY");
    expect(result.view.title).toMatch(/Protected Personal Time|Unavailable/);
    expect(result.view.locationLabel).toBeUndefined();
  });

  it("unauthenticated viewers do not see hidden campaign events", () => {
    const result = resolveEventVisibility({
      viewer: { authenticated: false, teamIds: [], calendarPermissions: {} },
      calendar: fundraisingCal,
      event: fundraiser,
    });
    expect(result.visible).toBe(false);
  });

  it("full managers receive FULL visibility for fundraising", () => {
    const result = resolveEventVisibility({
      viewer: fullViewer,
      calendar: fundraisingCal,
      event: fundraiser,
    });
    expect(result.visible).toBe(true);
    if (!result.visible) return;
    expect(result.view.visibilityLevel).toBe("FULL");
    expect(result.view.title).toBe(fundraiser.internalTitle);
    expect(result.view.canOpen).toBe(true);
  });
});
