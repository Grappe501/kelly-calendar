import { describe, expect, it } from "vitest";
import { resolveDisplayTitle } from "@/lib/calendar-security/event-title-policy";

describe("resolveDisplayTitle", () => {
  it("full audience receives internal title", () => {
    expect(
      resolveDisplayTitle(
        {
          internalTitle: "Dinner with John Smith, Jane Doe, and finance committee",
          campaignDisplayTitle: "Finance Committee Dinner",
        },
        "full",
        "Fundraising",
      ),
    ).toContain("John Smith");
  });

  it("limited audience receives safe campaign title", () => {
    expect(
      resolveDisplayTitle(
        {
          internalTitle: "Dinner with John Smith, Jane Doe, and finance committee",
          campaignDisplayTitle: "Finance Committee Dinner",
          sensitivity: "FUNDRAISING_SENSITIVE",
        },
        "campaign_limited",
        "Fundraising",
      ),
    ).toBe("Finance Committee Dinner");
  });

  it("sensitive titles without safe display use restricted or category fallback", () => {
    expect(
      resolveDisplayTitle(
        {
          internalTitle: "Medical appointment with provider name",
          restrictedDisplayTitle: "Protected Personal Time",
          sensitivity: "PROTECTED_PERSONAL",
        },
        "campaign_limited",
        "Protected Personal Time",
      ),
    ).toBe("Protected Personal Time");

    expect(
      resolveDisplayTitle(
        {
          internalTitle: "Secret strategy with named donors",
          sensitivity: "FUNDRAISING_SENSITIVE",
        },
        "campaign_limited",
        "Fundraising",
      ),
    ).toBe("Fundraising Event");
  });

  it("busy_only never returns internal titles", () => {
    const title = resolveDisplayTitle(
      {
        internalTitle: "Candidate dental appointment at Smith Family Dentistry",
        restrictedDisplayTitle: "Protected Personal Time",
      },
      "busy_only",
      "Protected Personal Time",
    );
    expect(title).toBe("Protected Personal Time");
    expect(title).not.toContain("dental");
  });
});
