import { describe, expect, it } from "vitest";
import {
  applyIcsPrivacyPolicy,
  assertNoExactAddress,
  buildStableEventUid,
  generateSubscriptionToken,
  hashSubscriptionToken,
  serializeIcsCalendar,
  type IcsExportProjection,
} from "@/lib/calendar/ics";

function baseEvent(
  overrides: Partial<IcsExportProjection> = {},
): IcsExportProjection {
  return {
    eventId: "evt_1",
    eventNumber: "E-100",
    uid: buildStableEventUid("evt_1"),
    sequence: 0,
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    updatedAt: new Date("2026-07-10T15:30:00.000Z"),
    startsAt: new Date("2026-08-01T17:00:00.000Z"),
    endsAt: new Date("2026-08-01T18:00:00.000Z"),
    timezone: "America/Chicago",
    isAllDay: false,
    status: "SCHEDULED",
    summary: "Campaign stop",
    isCancelled: false,
    ...overrides,
  };
}

describe("ICS overnight timed", () => {
  it("emits TZID floating start/end spanning midnight", () => {
    // 10pm CDT 2026-08-01 → 2am CDT 2026-08-02
    const body = serializeIcsCalendar({
      events: [
        baseEvent({
          startsAt: new Date("2026-08-02T03:00:00.000Z"),
          endsAt: new Date("2026-08-02T07:00:00.000Z"),
          timezone: "America/Chicago",
          summary: "Overnight travel",
        }),
      ],
    });
    expect(body).toContain("DTSTART;TZID=America/Chicago:20260801T220000");
    expect(body).toContain("DTEND;TZID=America/Chicago:20260802T020000");
    expect(body).not.toContain("BEGIN:VTIMEZONE");
  });
});

describe("ICS multi-day all-day exclusive end", () => {
  it("uses exclusive DATE end after last inclusive day", () => {
    // Chicago all-day Aug 1–3 inclusive → exclusive end Aug 4
    const body = serializeIcsCalendar({
      events: [
        baseEvent({
          isAllDay: true,
          startsAt: new Date("2026-08-01T05:00:00.000Z"),
          endsAt: new Date("2026-08-04T05:00:00.000Z"),
          timezone: "America/Chicago",
          summary: "Three day all-day",
        }),
      ],
    });
    expect(body).toContain("DTSTART;VALUE=DATE:20260801");
    expect(body).toContain("DTEND;VALUE=DATE:20260804");
  });
});

describe("ICS token rotate invalidates prior hash", () => {
  it("new token material has a different hash than the prior token", () => {
    const first = generateSubscriptionToken();
    const second = generateSubscriptionToken();
    expect(first.tokenHash).not.toBe(second.tokenHash);
    expect(hashSubscriptionToken(first.rawToken)).toBe(first.tokenHash);
    expect(hashSubscriptionToken(first.rawToken)).not.toBe(second.tokenHash);
    // Conceptual rotate: old raw no longer matches new stored hash
    expect(hashSubscriptionToken(first.rawToken)).not.toBe(
      hashSubscriptionToken(second.rawToken),
    );
  });
});

describe("BUSY_ONLY excludes description", () => {
  it("omits description even when publicDescription is present", () => {
    const fields = applyIcsPrivacyPolicy({
      profile: "BUSY_ONLY",
      event: {
        campaignDisplayTitle: "Secret Briefing",
        publicDescription: "Do not leak this blurb",
        city: "Little Rock",
        state: "AR",
        streetAddress: "123 Main St",
      },
      maxVisibilityGrant: "OPERATIONAL_REDACTED",
    });
    expect(fields.summary).toBe("Busy");
    expect(fields.description).toBeUndefined();
    expect(fields.location).toBeUndefined();
    assertNoExactAddress(fields);
    expect(JSON.stringify(fields)).not.toContain("blurb");
    expect(JSON.stringify(fields)).not.toContain("123 Main");
  });
});
