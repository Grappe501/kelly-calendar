import { describe, expect, it } from "vitest";
import { resolveLocationLabel } from "@/lib/calendar-security/location-disclosure";

const location = {
  venue: "Benton County Fairgrounds",
  city: "Rogers",
  county: "Benton",
  region: "Northwest Arkansas",
  state: "Arkansas",
  exactAddress: "1427 Private Road, Fayetteville, Arkansas",
};

describe("resolveLocationLabel", () => {
  it("generalizes exact addresses to city when disclosure is CITY", () => {
    expect(resolveLocationLabel(location, "CITY")).toBe("Rogers, Arkansas");
  });

  it("does not return exactAddress for CITY disclosure", () => {
    const label = resolveLocationLabel(location, "CITY");
    expect(label).not.toContain("1427");
    expect(label).not.toContain("Private Road");
  });

  it("returns venue-level labels for public venues", () => {
    expect(resolveLocationLabel(location, "VENUE")).toContain("Benton County Fairgrounds");
  });

  it("returns county labels", () => {
    expect(resolveLocationLabel(location, "COUNTY")).toBe("Benton County");
  });

  it("hides location when disclosure is HIDDEN", () => {
    expect(resolveLocationLabel(location, "HIDDEN")).toBeUndefined();
  });

  it("returns EXACT only when authorized", () => {
    expect(resolveLocationLabel(location, "EXACT")).toBe(location.exactAddress);
  });
});
