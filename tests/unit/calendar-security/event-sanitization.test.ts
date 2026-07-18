import { describe, expect, it } from "vitest";
import { sanitizeEventForViewer } from "@/lib/calendar-security/sanitize-event-for-viewer";
import type {
  CalendarContext,
  EventContext,
  ViewerContext,
} from "@/lib/calendar-security/calendar-access-types";

const calendar: CalendarContext = {
  id: "cal_fundraising",
  name: "Fundraising",
  type: "fundraising",
  defaultVisibility: "TITLE_LOCATION",
  locationDisclosure: "CITY",
};

const event: EventContext = {
  id: "evt_sanitize",
  internalTitle: "Private donor strategy meeting",
  campaignDisplayTitle: "Campaign Fundraiser",
  startsAt: "2026-08-18T18:00:00-05:00",
  endsAt: "2026-08-18T20:00:00-05:00",
  sensitivity: "FUNDRAISING_SENSITIVE",
  location: {
    city: "Conway",
    state: "Arkansas",
    exactAddress: "99 Hidden Lane",
  },
  privateNotes: "Do not leak",
  donorNames: ["Donor A"],
  hostPhone: "555-0000",
  attachmentIds: ["file_1"],
};

const viewer: ViewerContext = {
  authenticated: true,
  teamIds: [],
  calendarPermissions: { cal_fundraising: "AVAILABILITY_ONLY" },
};

describe("sanitizeEventForViewer", () => {
  it("omits protected fields from the safe view model", () => {
    const view = sanitizeEventForViewer({
      viewer,
      calendar,
      event,
      visibilityLevel: "TITLE_LOCATION",
      locationDisclosure: "CITY",
    });

    const keys = Object.keys(view);
    expect(keys).not.toContain("privateNotes");
    expect(keys).not.toContain("donorNames");
    expect(keys).not.toContain("hostPhone");
    expect(keys).not.toContain("attachmentIds");
    expect(keys).not.toContain("exactAddress");
    expect(keys).not.toContain("internalTitle");

    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("Do not leak");
    expect(serialized).not.toContain("Donor A");
    expect(serialized).not.toContain("555-0000");
    expect(serialized).not.toContain("99 Hidden Lane");
    expect(serialized).not.toContain("file_1");
  });

  it("includes calendar name, safe title, city location, and times", () => {
    const view = sanitizeEventForViewer({
      viewer,
      calendar,
      event,
      visibilityLevel: "TITLE_LOCATION",
      locationDisclosure: "CITY",
    });
    expect(view.calendarName).toBe("Fundraising");
    expect(view.title).toBe("Campaign Fundraiser");
    expect(view.locationLabel).toBe("Conway, Arkansas");
    expect(view.startsAt).toBe(event.startsAt);
    expect(view.endsAt).toBe(event.endsAt);
    expect(view.protectedFieldsOmitted).toBe(true);
  });
});
