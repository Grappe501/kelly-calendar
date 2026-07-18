import { describe, expect, it } from "vitest";
import { isElectionDateValid, isTimezoneValid } from "@/lib/env/public-config";

describe("timezone and election date validation", () => {
  it("accepts America/Chicago", () => {
    expect(isTimezoneValid("America/Chicago")).toBe(true);
  });

  it("rejects nonsense timezone", () => {
    expect(isTimezoneValid("Not/AZone")).toBe(false);
  });

  it("validates election date format", () => {
    expect(isElectionDateValid("2026-11-03")).toBe(true);
    expect(isElectionDateValid("11/03/2026")).toBe(false);
  });
});
