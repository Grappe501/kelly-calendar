import { describe, expect, it } from "vitest";
import {
  applyPrintPrivacy,
  assertPrintRowPrivacy,
  sortPrintEventRows,
  type PrintEventRow,
  type PrintPolicyEventInput,
} from "@/lib/calendar/print";

function baseEvent(
  overrides: Partial<PrintPolicyEventInput> = {},
): PrintPolicyEventInput {
  return {
    eventId: "evt_1",
    eventNumber: "E-100",
    title: "County stop",
    startsAt: "2026-08-01T17:00:00.000Z",
    endsAt: "2026-08-01T18:00:00.000Z",
    timezone: "America/Chicago",
    isAllDay: false,
    status: "CONFIRMED",
    city: "Little Rock",
    state: "AR",
    streetAddress: "123 Main St",
    venueName: "Civic Center",
    privateNotes: "Do not print this note",
    feedToken: "tok_secret",
    contacts: [{ name: "Secret Contact" }],
    calendarName: "Kelly Primary",
    missionLinked: true,
    conflictIndicator: true,
    ...overrides,
  };
}

describe("applyPrintPrivacy DAY_OPERATIONS_REDACTED", () => {
  it("excludes street address and private notes; city-only location", () => {
    const row = applyPrintPrivacy("DAY_OPERATIONS_REDACTED", baseEvent());
    expect(row.locationLabel).toBe("Little Rock, AR");
    expect(row.locationLabel).not.toMatch(/Main/);
    expect(row.calendarName).toBeUndefined();
    expect(JSON.stringify(row)).not.toMatch(/privateNotes|123 Main|tok_secret|Secret Contact/);
    assertPrintRowPrivacy(row);
  });
});

describe("applyPrintPrivacy INTERNAL_DAY_DETAIL", () => {
  it("still excludes street address while allowing venue + city", () => {
    const row = applyPrintPrivacy("INTERNAL_DAY_DETAIL", baseEvent());
    expect(row.locationLabel).toBe("Civic Center, Little Rock, AR");
    expect(row.locationLabel).not.toMatch(/Main St/);
    expect(row.calendarName).toBe("Kelly Primary");
    expect(row.missionLinked).toBe(true);
    expect(JSON.stringify(row)).not.toMatch(/privateNotes|streetAddress|tok_secret/);
    assertPrintRowPrivacy(row);
  });

  it("falls back to city-only for residential venues (street still never emitted)", () => {
    const row = applyPrintPrivacy(
      "INTERNAL_DAY_DETAIL",
      baseEvent({ venueName: "Private Home" }),
    );
    expect(row.locationLabel).toBe("Little Rock, AR");
    expect(JSON.stringify(row)).not.toMatch(/Main St|streetAddress/);
    assertPrintRowPrivacy(row);
  });
});

describe("applyPrintPrivacy WEEK_OVERVIEW", () => {
  it("excludes private notes and keeps titles + city + status", () => {
    const row = applyPrintPrivacy("WEEK_OVERVIEW", baseEvent());
    expect(row.title).toBe("County stop");
    expect(row.status).toBe("CONFIRMED");
    expect(row.locationLabel).toBe("Little Rock, AR");
    expect(row.calendarName).toBeUndefined();
    expect(row.missionLinked).toBeUndefined();
    expect(JSON.stringify(row)).not.toMatch(/privateNotes|Do not print/);
    assertPrintRowPrivacy(row);
  });
});

describe("sortPrintEventRows", () => {
  it("sorts stably by startsAt then eventNumber", () => {
    const rows: PrintEventRow[] = [
      {
        eventId: "b",
        eventNumber: "E-2",
        title: "Second",
        startsAt: "2026-08-01T18:00:00.000Z",
        endsAt: "2026-08-01T19:00:00.000Z",
        timezone: "America/Chicago",
        isAllDay: false,
        status: "CONFIRMED",
      },
      {
        eventId: "a1",
        eventNumber: "E-2",
        title: "Same start later number first in input",
        startsAt: "2026-08-01T17:00:00.000Z",
        endsAt: "2026-08-01T18:00:00.000Z",
        timezone: "America/Chicago",
        isAllDay: false,
        status: "CONFIRMED",
      },
      {
        eventId: "a0",
        eventNumber: "E-1",
        title: "First",
        startsAt: "2026-08-01T17:00:00.000Z",
        endsAt: "2026-08-01T18:00:00.000Z",
        timezone: "America/Chicago",
        isAllDay: false,
        status: "CONFIRMED",
      },
      {
        eventId: "a2",
        eventNumber: "E-2",
        title: "Same keys preserve input order",
        startsAt: "2026-08-01T17:00:00.000Z",
        endsAt: "2026-08-01T18:00:00.000Z",
        timezone: "America/Chicago",
        isAllDay: false,
        status: "CONFIRMED",
      },
    ];

    const sorted = sortPrintEventRows(rows);
    expect(sorted.map((r) => r.eventId)).toEqual(["a0", "a1", "a2", "b"]);
  });
});
