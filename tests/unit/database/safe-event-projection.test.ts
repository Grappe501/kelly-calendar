import { describe, expect, it } from "vitest";
import { projectSafeEvent } from "@/server/services/event-visibility-service";
import type { Calendar, Event } from "@prisma/client";

function fakeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "evt_1",
    eventNumber: "KCCC-2026-000001",
    sourceType: "MANUAL",
    createdByUserId: null,
    ownerUserId: null,
    primaryCalendarId: "cal_1",
    templateId: null,
    internalTitle: "Dinner with named donors",
    campaignDisplayTitle: "Women for Kelly Reception",
    restrictedDisplayTitle: "Fundraising Meeting",
    publicTitle: null,
    eventType: "Fundraiser",
    eventSubtype: null,
    status: "CONFIRMED",
    priority: "Normal",
    confirmationSource: null,
    confirmationStatus: null,
    startsAt: new Date("2026-08-18T17:30:00-05:00"),
    endsAt: new Date("2026-08-18T19:30:00-05:00"),
    timezone: "America/Chicago",
    isAllDay: false,
    isMultiDay: false,
    arrivalAt: null,
    departureAt: null,
    setupStartsAt: null,
    breakdownEndsAt: null,
    defaultVisibility: "TITLE_LOCATION",
    locationDisclosure: "CITY",
    sensitivityLevel: "FUNDRAISING_SENSITIVE",
    venueName: "Capital Hotel",
    streetAddress: "111 Markham",
    addressLine2: null,
    city: "Little Rock",
    countyId: null,
    state: "Arkansas",
    postalCode: null,
    regionId: null,
    locationNotes: null,
    virtualMeetingUrl: null,
    mapUrl: null,
    publicDescription: null,
    campaignDescription: null,
    privateNotes: "SECRET",
    candidateAttendance: null,
    candidateRole: null,
    expectedAttendance: null,
    actualAttendance: null,
    historicalReviewStatus: "UNREVIEWED",
    historicalAttendanceConfirmed: false,
    historicalOccurredConfirmed: false,
    historicalReviewedByUserId: null,
    historicalReviewedAt: null,
    isImported: false,
    isRecurring: false,
    recurrenceSeriesId: null,
    recurrenceRule: null,
    originalOccurrenceAt: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    archivedByUserId: null,
    archiveReason: null,
    ...overrides,
  } as Event;
}

function fakeCalendar(overrides: Partial<Calendar> = {}): Calendar {
  return {
    id: "cal_1",
    slug: "fundraising",
    name: "Fundraising",
    shortName: "Fundraising",
    description: null,
    calendarType: "FUNDRAISING",
    calendarGroupId: null,
    ownerUserId: null,
    managingTeamId: null,
    isSystemCalendar: true,
    isCommandCalendar: false,
    isActive: true,
    defaultVisibility: "TITLE_LOCATION",
    defaultLocationDisclosure: "CITY",
    defaultRollupMode: "TITLE_LOCATION",
    defaultEventDurationMinutes: 60,
    allowsPublicEvents: false,
    allowsExternalImport: true,
    allowsExternalExport: false,
    requiresApproval: false,
    allowsDirectEventCreation: true,
    displayOrder: 0,
    displayColorToken: "fundraising",
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    ...overrides,
  } as Calendar;
}

describe("projectSafeEvent", () => {
  it("returns null for NO_ACCESS", () => {
    expect(
      projectSafeEvent({
        event: fakeEvent(),
        calendar: fakeCalendar(),
        viewerAccess: "NO_ACCESS",
      }),
    ).toBeNull();
  });

  it("limited viewers get calendar name, safe title, city, times — not private notes", () => {
    const view = projectSafeEvent({
      event: fakeEvent(),
      calendar: fakeCalendar(),
      viewerAccess: "VIEW_LIMITED",
    });
    expect(view?.primaryCalendar.name).toBe("Fundraising");
    expect(view?.title).toBe("Women for Kelly Reception");
    expect(view?.location?.label).toBe("Little Rock, Arkansas");
    expect(view?.canOpen).toBe(false);
    expect(view?.protectedSectionsOmitted).toContain("PRIVATE_NOTES");
    expect(JSON.stringify(view)).not.toContain("SECRET");
    expect(JSON.stringify(view)).not.toContain("named donors");
  });

  it("protected personal uses busy-only", () => {
    const view = projectSafeEvent({
      event: fakeEvent({ restrictedDisplayTitle: "Protected Personal Time" }),
      calendar: fakeCalendar({
        calendarType: "PROTECTED_PERSONAL",
        name: "Protected Personal Time",
      }),
      viewerAccess: "AVAILABILITY_ONLY",
    });
    expect(view?.visibilityLevel).toBe("BUSY_ONLY");
    expect(view?.location).toBeUndefined();
  });
});
