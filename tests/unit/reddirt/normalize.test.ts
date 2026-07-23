import { describe, expect, it } from "vitest";
import { normalizeStrategicRecord } from "@/features/reddirt-integration/normalize";
import { loadStrategicGeographyFixture } from "@/features/reddirt-integration/fixture-reader";

describe("reddirt normalize", () => {
  it("fingerprints fixture records stably", () => {
    const fixture = loadStrategicGeographyFixture();
    expect(fixture._label).toMatch(/FIXTURE/);
    const a = normalizeStrategicRecord(fixture.records[0]);
    const b = normalizeStrategicRecord(fixture.records[0]);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.countyFips).toBe("05119");
    expect(a.factKind).toBe("COUNTY_PRIORITY");
    expect(a.excludedFieldCount).toBe(0);
  });

  it("excludes denied fields from fingerprint inputs", () => {
    const withPii = normalizeStrategicRecord({
      externalObjectId: "p1",
      objectType: "GEOGRAPHY_COUNTY",
      countyFips: "05143",
      factKind: "COUNTY_PRIORITY",
      factValue: "MEDIUM",
      email: "nope@example.com",
    });
    expect(withPii.allowedFields.email).toBeUndefined();
    expect(withPii.excludedFields).toContain("email");
  });
});
