import { describe, expect, it } from "vitest";
import {
  computeExceptionFingerprint,
  computeRuleFingerprint,
  evaluateAvailability,
  expandRuleIntervals,
  standingPolicySeedRules,
  type AvailabilityExceptionSnapshot,
  type AvailabilityRuleSnapshot,
} from "@/lib/calendar/availability";
import { chicagoDateKey } from "@/lib/calendar/chicago-date";

function makeRule(
  overrides: Partial<AvailabilityRuleSnapshot> = {},
): AvailabilityRuleSnapshot {
  const base: Omit<AvailabilityRuleSnapshot, "ruleFingerprint"> = {
    id: "r1",
    campaignKey: "kelly",
    subjectType: "CANDIDATE",
    subjectUserId: null,
    ruleType: "OFFICE_HOURS",
    classification: "UNAVAILABLE",
    timezone: "America/Chicago",
    effectiveStartDate: "2025-11-01",
    effectiveEndDate: null,
    startLocalTime: "08:00",
    endLocalTime: "12:00",
    weekdays: [1, 2, 3, 4, 5],
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    priority: 40,
    approvalState: "ACTIVE",
    label: "Office hours",
    locationHint: null,
    isActive: true,
    ...overrides,
  };
  return { ...base, ruleFingerprint: computeRuleFingerprint(base) };
}

function makeException(
  overrides: Partial<AvailabilityExceptionSnapshot> = {},
): AvailabilityExceptionSnapshot {
  const base: Omit<AvailabilityExceptionSnapshot, "exceptionFingerprint"> = {
    id: "e1",
    campaignKey: "kelly",
    ruleId: null,
    subjectType: "CANDIDATE",
    startDate: "2026-08-01",
    endDateExclusive: "2026-08-02",
    startLocalTime: null,
    endLocalTime: null,
    isAllDay: true,
    timezone: "America/Chicago",
    classification: "AVAILABLE",
    label: "One-off opening",
    approvalState: "ACTIVE",
    isActive: true,
    ...overrides,
  };
  return { ...base, exceptionFingerprint: computeExceptionFingerprint(base) };
}

describe("evaluateAvailability", () => {
  it("classifies a preferred window as PREFERRED", () => {
    const rule = makeRule({
      id: "pref",
      ruleType: "PREFERRED_WINDOW",
      classification: "PREFERRED",
      startLocalTime: "12:00",
      endLocalTime: "13:00",
      priority: 60,
    });
    const result = evaluateAvailability({
      rules: [rule],
      exceptions: [],
      startsAt: new Date("2026-08-04T17:15:00.000Z"), // Tue 12:15 CDT
      endsAt: new Date("2026-08-04T17:45:00.000Z"),
      timezone: "America/Chicago",
      isAllDay: false,
    });
    expect(result.classification).toBe("PREFERRED");
  });

  it("classifies an unavailable overlap as blocking", () => {
    const rule = makeRule();
    const result = evaluateAvailability({
      rules: [rule],
      exceptions: [],
      startsAt: new Date("2026-08-04T14:00:00.000Z"), // Tue 09:00 CDT
      endsAt: new Date("2026-08-04T15:00:00.000Z"),
      timezone: "America/Chicago",
      isAllDay: false,
    });
    expect(result.classification).toBe("UNAVAILABLE");
    expect(result.findings.some((f) => f.blocksSave)).toBe(true);
    expect(result.findings.some((f) => f.requiresAcknowledgement)).toBe(true);
  });

  it("lets an ACTIVE exception override an otherwise unavailable rule", () => {
    const rule = makeRule({ id: "morning", weekdays: [] });
    const exception = makeException({
      id: "opening",
      startDate: "2026-08-04",
      endDateExclusive: "2026-08-05",
      classification: "AVAILABLE",
    });
    const result = evaluateAvailability({
      rules: [rule],
      exceptions: [exception],
      startsAt: new Date("2026-08-04T14:00:00.000Z"),
      endsAt: new Date("2026-08-04T15:00:00.000Z"),
      timezone: "America/Chicago",
      isAllDay: false,
    });
    expect(result.classification).toBe("AVAILABLE");
  });

  it("treats a touching boundary as non-overlapping (half-open intervals)", () => {
    const rule = makeRule();
    const result = evaluateAvailability({
      rules: [rule],
      exceptions: [],
      // Rule ends 12:00 CDT (17:00 UTC); Event starts exactly then.
      startsAt: new Date("2026-08-04T17:00:00.000Z"),
      endsAt: new Date("2026-08-04T18:00:00.000Z"),
      timezone: "America/Chicago",
      isAllDay: false,
    });
    expect(result.findings.length).toBe(0);
    expect(result.classification).not.toBe("UNAVAILABLE");
  });

  it("expands the protected interval by configured buffers", () => {
    const rule = makeRule({
      id: "buffered",
      ruleType: "PROTECTED_WORK",
      classification: "CONSTRAINED",
      bufferBeforeMinutes: 30,
      bufferAfterMinutes: 30,
    });
    const result = evaluateAvailability({
      rules: [rule],
      exceptions: [],
      // 07:45-08:00 CDT — inside the 30-minute pre-buffer only.
      startsAt: new Date("2026-08-04T12:45:00.000Z"),
      endsAt: new Date("2026-08-04T13:00:00.000Z"),
      timezone: "America/Chicago",
      isAllDay: false,
    });
    expect(result.classification).toBe("CONSTRAINED");
  });

  it("classifies UNKNOWN (not AVAILABLE) when there are no active rules", () => {
    const result = evaluateAvailability({
      rules: [],
      exceptions: [],
      startsAt: new Date("2026-08-04T14:00:00.000Z"),
      endsAt: new Date("2026-08-04T15:00:00.000Z"),
      timezone: "America/Chicago",
      isAllDay: false,
    });
    expect(result.classification).toBe("UNKNOWN");
  });

  it("does not mutate rule or exception inputs", () => {
    const rule = makeRule({ id: "immut" });
    const exception = makeException({ id: "immut-ex" });
    const ruleSnapshot = JSON.stringify(rule);
    const exceptionSnapshot = JSON.stringify(exception);
    evaluateAvailability({
      rules: [rule],
      exceptions: [exception],
      startsAt: new Date("2026-08-04T14:00:00.000Z"),
      endsAt: new Date("2026-08-04T15:00:00.000Z"),
      timezone: "America/Chicago",
      isAllDay: false,
    });
    expect(JSON.stringify(rule)).toBe(ruleSnapshot);
    expect(JSON.stringify(exception)).toBe(exceptionSnapshot);
  });
});

describe("expandRuleIntervals — DST", () => {
  it("keeps a stable 09:00 America/Chicago wall time across spring-forward (2026-03-08)", () => {
    const rule = makeRule({
      id: "dst",
      ruleType: "GENERAL_AVAILABILITY",
      classification: "PREFERRED",
      startLocalTime: "09:00",
      endLocalTime: "10:00",
      weekdays: [],
    });
    const expanded = expandRuleIntervals({
      rule,
      rangeStartsAt: new Date("2026-03-07T00:00:00.000Z"),
      rangeEndsAt: new Date("2026-03-10T00:00:00.000Z"),
    });
    const interval = expanded.intervals.find(
      (candidate) => chicagoDateKey(candidate.startsAt) === "2026-03-08",
    );
    expect(interval).toBeDefined();
    const wallHour = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "2-digit",
      hour12: false,
    }).format(interval!.startsAt);
    expect(wallHour.replace(/[^0-9]/g, "")).toBe("09");
  });
});

describe("fingerprints", () => {
  it("are stable for identical rule input", () => {
    const a = makeRule({ id: "fp" });
    const b = makeRule({ id: "fp" });
    expect(a.ruleFingerprint).toBe(b.ruleFingerprint);
  });

  it("change when classification changes", () => {
    const a = makeRule({ id: "fp" });
    const b = makeRule({ id: "fp", classification: "AVAILABLE" });
    expect(a.ruleFingerprint).not.toBe(b.ruleFingerprint);
  });
});

describe("standingPolicySeedRules", () => {
  it("produces fingerprinted standing policy rules", () => {
    const seeds = standingPolicySeedRules("kelly");
    expect(seeds.length).toBeGreaterThanOrEqual(4);
    for (const seed of seeds) {
      expect(seed.ruleFingerprint).toBeTruthy();
      expect(seed.campaignKey).toBe("kelly");
    }
  });
});
