import { describe, expect, it } from "vitest";
import { getElectionCountdown } from "@/lib/dates/election";

describe("getElectionCountdown", () => {
  it("counts days until the configured election date", () => {
    const result = getElectionCountdown(
      new Date("2026-07-18T12:00:00Z"),
      "2026-11-03",
      "America/Chicago",
    );
    expect(result.isElectionDay).toBe(false);
    expect(result.isPastElection).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(90);
    expect(result.label).toContain("until Election Day");
  });

  it("detects election day", () => {
    const result = getElectionCountdown(
      new Date("2026-11-03T17:00:00Z"),
      "2026-11-03",
      "America/Chicago",
    );
    expect(result.isElectionDay).toBe(true);
    expect(result.daysRemaining).toBe(0);
    expect(result.label).toBe("Election Day");
  });
});
