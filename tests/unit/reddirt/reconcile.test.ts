import { describe, expect, it } from "vitest";
import { reconcileGeography } from "@/lib/geography";
import { reconcileRedDirtGeography } from "@/features/reddirt-integration/geography-reconcile";
import { normalizeStrategicRecord } from "@/features/reddirt-integration/normalize";
import { loadStrategicGeographyFixture } from "@/features/reddirt-integration/fixture-reader";
import type { GeographyAuthorityIndex } from "@/lib/geography";

function sampleIndex(): GeographyAuthorityIndex {
  const pulaski = {
    id: "county-pulaski",
    fipsCode: "05119",
    normalizedName: "pulaski",
    name: "Pulaski",
  };
  const washington = {
    id: "county-washington",
    fipsCode: "05143",
    normalizedName: "washington",
    name: "Washington",
  };
  return {
    countiesByFips: new Map([
      ["05119", pulaski],
      ["05143", washington],
    ]),
    countiesByNormalized: new Map([
      ["pulaski", [pulaski]],
      ["washington", [washington]],
    ]),
    placesByGeoid: new Map(),
    placesByNormalized: new Map(),
    aliasesByNormalized: new Map(),
  };
}

describe("reddirt geography reconcile", () => {
  it("EXACT matches fixture FIPS to IC-01 county id", () => {
    const index = sampleIndex();
    const fixture = loadStrategicGeographyFixture();
    const normalized = normalizeStrategicRecord(fixture.records[0]);
    const result = reconcileRedDirtGeography(normalized, index);
    expect(result.outcome).toBe("EXACT");
    expect(result.matchMethod).toBe("AUTHORITATIVE_ID");
    expect(result.proposedLocalObjectType).toBe("ArkansasCounty");
    expect(result.proposedLocalObjectId).toBe("county-pulaski");
    expect(result.countyId).toBe("county-pulaski");
  });

  it("uses IC-01 reconcileGeography for authoritative FIPS", () => {
    const index = sampleIndex();
    const base = reconcileGeography(
      { authoritativeId: "05143" },
      index,
    );
    expect(base.outcome).toBe("EXACT");
    expect(base.countyId).toBe("county-washington");
  });

  it("marks unchanged when fingerprint already applied", () => {
    const index = sampleIndex();
    const fixture = loadStrategicGeographyFixture();
    const normalized = normalizeStrategicRecord(fixture.records[0]);
    const existing = new Map([
      [normalized.externalObjectId, normalized.fingerprint],
    ]);
    const result = reconcileRedDirtGeography(normalized, index, existing);
    expect(result.action).toBe("MATCHED_UNCHANGED");
  });
});
