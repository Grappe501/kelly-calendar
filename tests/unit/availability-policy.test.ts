import { describe, expect, it } from "vitest";
import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";

describe("standing availability policy", () => {
  it("blocks weekday work windows and defaults Tuesday to Little Rock", () => {
    const policy = getStandingAvailabilityPolicy();
    expect(policy.timezone).toBe("America/Chicago");
    expect(policy.databaseEventsCreated).toBe(false);
    const work = policy.rules.find((rule) => rule.id === "weekday-work-blocks");
    expect(work?.windows?.map((w) => `${w.start}-${w.end}`)).toEqual([
      "08:00-12:00",
      "13:00-17:00",
    ]);
    expect(work?.overrideAllowed).toBe(true);
    const tuesday = policy.rules.find((rule) => rule.id === "tuesday-little-rock-default");
    expect(tuesday?.location).toBe("Little Rock, Arkansas");
  });
});
