import { describe, expect, it } from "vitest";
import {
  applyIcsPrivacyPolicy,
  assertNoExactAddress,
  buildStableEventUid,
  computeIcsBodyEtag,
  escapeIcsText,
  exclusiveAllDayEnd,
  foldIcsLine,
  formatIcsDateOnly,
  generateSubscriptionToken,
  hashSubscriptionToken,
  ICS_PRODID,
  serializeIcsCalendar,
  tokensEqual,
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

describe("ICS text helpers", () => {
  it("escapes commas, semicolons, backslashes, and newlines", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    expect(escapeIcsText("line1\r\nline2")).toBe("line1\\nline2");
  });

  it("folds long lines at 75 octets with CRLF space continuation", () => {
    const long = `SUMMARY:${"X".repeat(90)}`;
    const folded = foldIcsLine(long);
    expect(folded).toContain("\r\n ");
    const firstLine = folded.split("\r\n")[0];
    expect(Buffer.from(firstLine, "utf8").length).toBeLessThanOrEqual(75);
  });

  it("computes exclusive all-day end as day after inclusive end", () => {
    expect(exclusiveAllDayEnd("2026-08-01", "2026-08-01")).toBe("20260802");
    expect(exclusiveAllDayEnd("2026-08-01", "2026-08-03")).toBe("20260804");
    expect(formatIcsDateOnly("2026-08-01")).toBe("20260801");
  });
});

describe("ICS privacy policy", () => {
  const sensitive = {
    campaignDisplayTitle: "Donor Briefing",
    publicTitle: "Public Briefing",
    city: "Little Rock",
    state: "AR",
    streetAddress: "123 Main St",
    venueName: "Private Home",
    publicDescription: "Public blurb",
    privateNotes: "SECRET DO NOT LEAK",
    status: "SCHEDULED",
  };

  it("BUSY_ONLY omits title content and uses Busy summary", () => {
    const fields = applyIcsPrivacyPolicy({
      profile: "BUSY_ONLY",
      event: sensitive,
      maxVisibilityGrant: "OPERATIONAL_REDACTED",
    });
    expect(fields.summary).toBe("Busy");
    expect(fields.description).toBeUndefined();
    expect(fields.location).toBeUndefined();
    expect(JSON.stringify(fields)).not.toContain("Donor");
    expect(JSON.stringify(fields)).not.toContain("123 Main");
    expect(JSON.stringify(fields)).not.toContain("SECRET");
  });

  it("CITY_ONLY never includes street address even when present on input", () => {
    const fields = applyIcsPrivacyPolicy({
      profile: "CITY_ONLY",
      event: sensitive,
      maxVisibilityGrant: "OPERATIONAL_REDACTED",
    });
    expect(fields.summary).toBe("Donor Briefing");
    expect(fields.location).toBe("Little Rock, AR");
    expect(fields.description).toBe("Public blurb");
    expect(JSON.stringify(fields)).not.toContain("123 Main");
    expect(JSON.stringify(fields)).not.toContain("SECRET");
    assertNoExactAddress(fields);
  });

  it("OPERATIONAL_REDACTED never includes street address", () => {
    const fields = applyIcsPrivacyPolicy({
      profile: "OPERATIONAL_REDACTED",
      event: {
        ...sensitive,
        venueName: "River Center",
        streetAddress: "999 Exact Ave",
        isResidential: false,
      },
      maxVisibilityGrant: "OPERATIONAL_REDACTED",
    });
    expect(fields.summary).toBe("Donor Briefing");
    expect(fields.location).toBe("Little Rock, AR");
    expect(JSON.stringify(fields)).not.toContain("999 Exact");
    expect(JSON.stringify(fields)).not.toContain("SECRET");
    assertNoExactAddress(fields);
  });

  it("maxVisibilityGrant can further restrict OPERATIONAL_REDACTED to BUSY_ONLY", () => {
    const fields = applyIcsPrivacyPolicy({
      profile: "OPERATIONAL_REDACTED",
      event: sensitive,
      maxVisibilityGrant: "BUSY_ONLY",
    });
    expect(fields.summary).toBe("Busy");
  });
});

describe("ICS UID", () => {
  it("is stable across calls", () => {
    expect(buildStableEventUid("abc")).toBe(buildStableEventUid("abc"));
    expect(buildStableEventUid("abc")).toBe(
      "kccc-event-abc@kelly-calendar.netlify.app",
    );
  });
});

describe("ICS serialize", () => {
  it("emits CRLF endings and VCALENDAR headers", () => {
    const body = serializeIcsCalendar({
      calendarName: "Kelly Ops",
      events: [baseEvent()],
    });
    expect(body.endsWith("\r\n")).toBe(true);
    expect(body).toContain("BEGIN:VCALENDAR\r\n");
    expect(body).toContain(`PRODID:${ICS_PRODID}`);
    expect(body).toContain("VERSION:2.0");
    expect(body).toContain("CALSCALE:GREGORIAN");
    expect(body).toContain("METHOD:PUBLISH");
    expect(body).toContain("X-WR-CALNAME:Kelly Ops");
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("END:VEVENT");
    expect(body).toContain("END:VCALENDAR");
    expect(body.includes("\r\n")).toBe(true);
  });

  it("uses exclusive DATE end for all-day events", () => {
    const body = serializeIcsCalendar({
      events: [
        baseEvent({
          isAllDay: true,
          startsAt: new Date("2026-08-01T05:00:00.000Z"),
          endsAt: new Date("2026-08-02T05:00:00.000Z"),
          summary: "All day",
        }),
      ],
    });
    expect(body).toContain("DTSTART;VALUE=DATE:20260801");
    expect(body).toContain("DTEND;VALUE=DATE:20260802");
  });

  it("orders events by startsAt then uid", () => {
    const body = serializeIcsCalendar({
      events: [
        baseEvent({
          eventId: "b",
          uid: buildStableEventUid("b"),
          startsAt: new Date("2026-08-02T17:00:00.000Z"),
          endsAt: new Date("2026-08-02T18:00:00.000Z"),
          summary: "Second",
        }),
        baseEvent({
          eventId: "a",
          uid: buildStableEventUid("a"),
          startsAt: new Date("2026-08-01T17:00:00.000Z"),
          endsAt: new Date("2026-08-01T18:00:00.000Z"),
          summary: "First",
        }),
      ],
    });
    const firstIdx = body.indexOf("SUMMARY:First");
    const secondIdx = body.indexOf("SUMMARY:Second");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(firstIdx);
  });

  it("maps CANCELLED and produces deterministic weak etag", () => {
    const body = serializeIcsCalendar({
      events: [baseEvent({ isCancelled: true, status: "CANCELLED" })],
    });
    expect(body).toContain("STATUS:CANCELLED");
    const etag = computeIcsBodyEtag(body);
    expect(etag).toMatch(/^W\/"[a-f0-9]{64}"$/);
    expect(computeIcsBodyEtag(body)).toBe(etag);
  });
});

describe("ICS subscription tokens", () => {
  it("hashes raw token and never equals raw", () => {
    const t = generateSubscriptionToken();
    expect(t.rawToken.startsWith("kccc_feed_")).toBe(true);
    expect(t.tokenHash).toBe(hashSubscriptionToken(t.rawToken));
    expect(t.tokenHash).not.toBe(t.rawToken);
    expect(t.tokenPrefix).toBe(t.rawToken.slice(0, 12));
    expect(t.tokenVersion).toBe(1);
  });

  it("compares hashes with timing-safe equality", () => {
    const t = generateSubscriptionToken();
    expect(tokensEqual(t.tokenHash, t.tokenHash)).toBe(true);
    expect(tokensEqual(t.tokenHash, hashSubscriptionToken("other"))).toBe(
      false,
    );
    expect(tokensEqual("abc", "abcd")).toBe(false);
  });
});
