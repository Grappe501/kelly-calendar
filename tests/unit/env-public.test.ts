import { describe, expect, it } from "vitest";
import {
  getPublicEnvironment,
  tryGetPublicEnvironment,
} from "@/lib/env/public-environment";

describe("public environment", () => {
  it("accepts valid public defaults", () => {
    const value = getPublicEnvironment({
      NEXT_PUBLIC_APP_NAME: "Kelly Campaign Command Calendar",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_CAMPAIGN_TIMEZONE: "America/Chicago",
      NEXT_PUBLIC_ELECTION_DATE: "2026-11-03",
    });
    expect(value.campaignTimezone).toBe("America/Chicago");
  });

  it("rejects invalid election date and timezone", () => {
    expect(
      tryGetPublicEnvironment({
        NEXT_PUBLIC_ELECTION_DATE: "11/03/2026",
        NEXT_PUBLIC_CAMPAIGN_TIMEZONE: "America/Chicago",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }).ok,
    ).toBe(false);
    expect(
      tryGetPublicEnvironment({
        NEXT_PUBLIC_ELECTION_DATE: "2026-11-03",
        NEXT_PUBLIC_CAMPAIGN_TIMEZONE: "Not/AZone",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }).ok,
    ).toBe(false);
  });
});
