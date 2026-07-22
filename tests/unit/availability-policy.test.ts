import { describe, expect, it } from "vitest";
import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";
import { isStandingWorkBlockEvent } from "@/lib/campaign/standing-work-blocks";

describe("standing availability policy", () => {
  it("blocks weekday work windows and defaults Tuesday to Little Rock", () => {
    const policy = getStandingAvailabilityPolicy();
    expect(policy.timezone).toBe("America/Chicago");
    expect(policy.databaseEventsCreated).toBe(false);
    expect(policy.listedOnCalendar).toBe(false);
    expect(policy.countedInWorkload).toBe(false);
    const work = policy.rules.find((rule) => rule.id === "weekday-campaign-office-hours");
    expect(work?.windows?.map((w) => `${w.start}-${w.end}`)).toEqual([
      "08:00-12:00",
      "13:00-17:00",
    ]);
    expect(work?.overrideAllowed).toBe(true);
    const tuesday = policy.rules.find((rule) => rule.id === "tuesday-little-rock-office");
    expect(tuesday?.location).toBe("Little Rock Campaign Office");
  });
});

describe("standing work block detection", () => {
  it("recognizes office-hour event types and ingest keys", () => {
    expect(
      isStandingWorkBlockEvent({ eventType: "Campaign Office Hours" }),
    ).toBe(true);
    expect(
      isStandingWorkBlockEvent({
        privateNotes: "[ingestKey:standing-office-am-2026-08-07]\n[pass:x]",
      }),
    ).toBe(true);
    expect(
      isStandingWorkBlockEvent({
        title: "Hope Watermelon Festival",
        eventType: "Community Festival / Regional Outreach",
      }),
    ).toBe(false);
  });
});
