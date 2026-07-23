/**
 * Unit tests for IC-02A eligibility (pure; zero DB).
 */
import { describe, expect, it } from "vitest";
import {
  evaluateEventReviewEligibility,
  outcomeIndicatorLabel,
} from "@/lib/calendar/event-outcomes/eligibility";
import { buildScheduledFingerprint } from "@/lib/calendar/event-outcomes/fingerprint";
import {
  assertIcsExcludesOutcomeContent,
  NAME_ONLY_MATCH_BLOCKED,
  redactForBroadReport,
} from "@/lib/calendar/event-outcomes/privacy";

const tz = "America/Chicago";

describe("IC-02A event review eligibility", () => {
  it("in-progress Event is NOT_YET_DUE", () => {
    const now = new Date("2026-07-23T18:00:00.000Z");
    const result = evaluateEventReviewEligibility({
      schedule: {
        startsAt: new Date("2026-07-23T17:00:00.000Z"),
        endsAt: new Date("2026-07-23T20:00:00.000Z"),
        timezone: tz,
        isAllDay: false,
        status: "CONFIRMED",
      },
      now,
    });
    expect(result.eligibility).toBe("NOT_YET_DUE");
  });

  it("finished Event is REVIEW_DUE without implying completion", () => {
    const now = new Date("2026-07-23T21:00:00.000Z");
    const result = evaluateEventReviewEligibility({
      schedule: {
        startsAt: new Date("2026-07-23T17:00:00.000Z"),
        endsAt: new Date("2026-07-23T20:00:00.000Z"),
        timezone: tz,
        isAllDay: false,
        status: "CONFIRMED",
      },
      now,
    });
    expect(result.eligibility).toBe("REVIEW_DUE");
    expect(result.reason).toMatch(/not auto-completed/i);
  });

  it("start passing alone does not make review due", () => {
    const now = new Date("2026-07-23T18:00:00.000Z");
    const result = evaluateEventReviewEligibility({
      schedule: {
        startsAt: new Date("2026-07-23T17:00:00.000Z"),
        endsAt: new Date("2026-07-23T22:00:00.000Z"),
        timezone: tz,
        isAllDay: false,
      },
      now,
    });
    expect(result.eligibility).toBe("NOT_YET_DUE");
  });

  it("all-day becomes reviewable after exclusive end", () => {
    // All-day stored as [midnight start, exclusive next midnight)
    const result = evaluateEventReviewEligibility({
      schedule: {
        startsAt: new Date("2026-07-23T05:00:00.000Z"), // Jul 23 Chicago midnight CDT
        endsAt: new Date("2026-07-24T05:00:00.000Z"),
        timezone: tz,
        isAllDay: true,
        status: "CONFIRMED",
      },
      now: new Date("2026-07-24T05:00:00.000Z"),
    });
    expect(result.eligibility).toBe("REVIEW_DUE");
  });

  it("cross-midnight uses endsAt", () => {
    const result = evaluateEventReviewEligibility({
      schedule: {
        startsAt: new Date("2026-07-23T23:00:00.000Z"),
        endsAt: new Date("2026-07-24T02:00:00.000Z"),
        timezone: tz,
        isAllDay: false,
      },
      now: new Date("2026-07-24T01:00:00.000Z"),
    });
    expect(result.eligibility).toBe("NOT_YET_DUE");
    const after = evaluateEventReviewEligibility({
      schedule: {
        startsAt: new Date("2026-07-23T23:00:00.000Z"),
        endsAt: new Date("2026-07-24T02:00:00.000Z"),
        timezone: tz,
        isAllDay: false,
      },
      now: new Date("2026-07-24T02:00:00.000Z"),
    });
    expect(after.eligibility).toBe("REVIEW_DUE");
  });

  it("cancelled Event is reviewable immediately", () => {
    const result = evaluateEventReviewEligibility({
      schedule: {
        startsAt: new Date("2026-07-25T17:00:00.000Z"),
        endsAt: new Date("2026-07-25T20:00:00.000Z"),
        timezone: tz,
        isAllDay: false,
        status: "CANCELLED",
      },
      now: new Date("2026-07-20T12:00:00.000Z"),
    });
    expect(result.eligibility).toBe("REVIEW_DUE");
  });

  it("postponed is reviewable and distinct from cancelled status on Event", () => {
    const result = evaluateEventReviewEligibility({
      schedule: {
        startsAt: new Date("2026-07-25T17:00:00.000Z"),
        endsAt: new Date("2026-07-25T20:00:00.000Z"),
        timezone: tz,
        isAllDay: false,
        status: "POSTPONED",
      },
      now: new Date("2026-07-20T12:00:00.000Z"),
    });
    expect(result.eligibility).toBe("REVIEW_DUE");
  });

  it("existing DRAFT / REVIEWED / STALE surfaces", () => {
    const schedule = {
      startsAt: new Date("2026-07-20T17:00:00.000Z"),
      endsAt: new Date("2026-07-20T20:00:00.000Z"),
      timezone: tz,
      isAllDay: false,
      status: "CONFIRMED",
    };
    const fp = buildScheduledFingerprint(schedule);
    expect(
      evaluateEventReviewEligibility({
        schedule,
        now: new Date("2026-07-23T12:00:00.000Z"),
        existing: { status: "DRAFT", scheduledFingerprint: fp },
      }).eligibility,
    ).toBe("DRAFT");
    expect(
      evaluateEventReviewEligibility({
        schedule,
        now: new Date("2026-07-23T12:00:00.000Z"),
        existing: { status: "REVIEWED", scheduledFingerprint: fp },
      }).eligibility,
    ).toBe("REVIEWED");
    expect(
      evaluateEventReviewEligibility({
        schedule,
        now: new Date("2026-07-23T12:00:00.000Z"),
        existing: { status: "REVIEWED", scheduledFingerprint: "old-fp" },
      }).eligibility,
    ).toBe("STALE");
  });

  it("indicators are restrained", () => {
    expect(outcomeIndicatorLabel("REVIEW_DUE")).toBe("Review due");
    expect(outcomeIndicatorLabel("DRAFT")).toBe("Hot wash draft");
    expect(outcomeIndicatorLabel("REVIEWED")).toBe("Reviewed");
    expect(outcomeIndicatorLabel("STALE")).toBe("Outcome stale");
    expect(outcomeIndicatorLabel("REVIEWED", true)).toBe("Follow-up needed");
  });

  it("confidential redaction and ICS deny", () => {
    const r = redactForBroadReport({
      content: "secret",
      privacyClassification: "CONFIDENTIAL",
      viewerMaySeeConfidential: false,
    });
    expect(r.redacted).toBe(true);
    expect(() =>
      assertIcsExcludesOutcomeContent("SUMMARY:hi\nwhatHappened:bad"),
    ).toThrow(/outcome/i);
    expect(NAME_ONLY_MATCH_BLOCKED).toMatch(/Name-only/);
  });
});
