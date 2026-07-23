import { describe, expect, it } from "vitest";
import {
  deriveOverallHealthState,
  isAlertResolved,
  isAlertStillOpen,
  isStale,
  stableFindingKey,
} from "@/lib/calendar/health/doctrine";
import {
  FULL_FRESHNESS_MS,
  LIGHTWEIGHT_FRESHNESS_MS,
} from "@/lib/calendar/health/bounds";
import { MANDATORY_DOMAINS } from "@/lib/calendar/health/types";

function healthyBase(
  overrides: Partial<Parameters<typeof deriveOverallHealthState>[0]> = {},
) {
  const expected = MANDATORY_DOMAINS.FULL.length;
  return deriveOverallHealthState({
    mandatoryExpected: expected,
    mandatoryCompleted: expected,
    mandatoryFailed: 0,
    mandatorySkipped: 0,
    truncated: false,
    criticalFindings: 0,
    warningFindings: 0,
    configState: "OK",
    ...overrides,
  });
}

describe("deriveOverallHealthState", () => {
  it("is HEALTHY only when all mandatory domains complete successfully", () => {
    expect(healthyBase()).toBe("HEALTHY");
  });

  it("is not HEALTHY when any mandatory domain failed", () => {
    expect(
      healthyBase({
        mandatoryCompleted: MANDATORY_DOMAINS.FULL.length - 1,
        mandatoryFailed: 1,
      }),
    ).toBe("UNHEALTHY");
  });

  it("is not HEALTHY when mandatory domains were skipped", () => {
    expect(
      healthyBase({
        mandatoryCompleted: MANDATORY_DOMAINS.FULL.length - 2,
        mandatorySkipped: 2,
      }),
    ).toBe("PARTIAL");
    expect(
      healthyBase({
        mandatoryCompleted: 0,
        mandatorySkipped: MANDATORY_DOMAINS.FULL.length,
      }),
    ).toBe("UNKNOWN");
  });

  it("treats truncation as PARTIAL or DEGRADED, never HEALTHY", () => {
    expect(healthyBase({ truncated: true })).toBe("PARTIAL");
    expect(healthyBase({ truncated: true, warningFindings: 3 })).toBe(
      "DEGRADED",
    );
  });

  it("never returns HEALTHY when database is missing or failed", () => {
    expect(healthyBase({ configState: "MISSING_DATABASE" })).toBe("UNKNOWN");
    expect(healthyBase({ configState: "MISSING_SECRET" })).toBe(
      "NOT_CONFIGURED",
    );
    expect(healthyBase({ configState: "DATABASE_ERROR" })).toBe("UNHEALTHY");
    expect(healthyBase({ configState: "FAILED_DATABASE" })).toBe("UNHEALTHY");
  });

  it("is UNHEALTHY on critical findings even when mandatory domains ok", () => {
    expect(healthyBase({ criticalFindings: 1 })).toBe("UNHEALTHY");
  });

  it("is DEGRADED on warnings when mandatory domains ok", () => {
    expect(healthyBase({ warningFindings: 2 })).toBe("DEGRADED");
  });
});

describe("alert disposition doctrine", () => {
  it("ACKNOWLEDGED does not equal resolved", () => {
    expect(isAlertResolved("ACKNOWLEDGED")).toBe(false);
    expect(isAlertStillOpen("ACKNOWLEDGED")).toBe(true);
    expect(isAlertResolved("RESOLVED")).toBe(true);
    expect(isAlertStillOpen("RESOLVED")).toBe(false);
    expect(isAlertStillOpen("OPEN")).toBe(true);
  });
});

describe("stableFindingKey", () => {
  it("is deterministic across calls", () => {
    expect(stableFindingKey("integrity", "OPEN_CRITICAL", "evt_1")).toBe(
      stableFindingKey("integrity", "OPEN_CRITICAL", "evt_1"),
    );
    expect(stableFindingKey("jobs", "LEASE_EXPIRED")).toBe("jobs:lease_expired");
    expect(stableFindingKey("Events", "TYPE", "Ref")).toBe("events:type:ref");
  });
});

describe("isStale", () => {
  it("marks missing or old completions stale", () => {
    const now = new Date("2026-07-23T12:00:00.000Z");
    expect(isStale(null, LIGHTWEIGHT_FRESHNESS_MS, now)).toBe(true);
    expect(
      isStale(
        new Date("2026-07-23T11:50:00.000Z"),
        LIGHTWEIGHT_FRESHNESS_MS,
        now,
      ),
    ).toBe(false);
    expect(
      isStale(new Date("2026-07-22T11:00:00.000Z"), FULL_FRESHNESS_MS, now),
    ).toBe(true);
  });
});
