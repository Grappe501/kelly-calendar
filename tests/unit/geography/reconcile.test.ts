import { describe, expect, it } from "vitest";
import { reconcileGeography } from "@/lib/geography/reconcile";
import type { GeographyAuthorityIndex } from "@/lib/geography/types";

function index(): GeographyAuthorityIndex {
  const pulaski = {
    id: "c-pulaski",
    fipsCode: "05119",
    normalizedName: "pulaski",
    name: "Pulaski",
  };
  const littleRock = {
    id: "p-lr",
    censusPlaceGeoid: "0541000",
    normalizedName: "little rock",
    name: "Little Rock",
    primaryCountyFips: "05119",
  };
  return {
    countiesByFips: new Map([["05119", pulaski]]),
    countiesByNormalized: new Map([["pulaski", [pulaski]]]),
    placesByGeoid: new Map([["0541000", littleRock]]),
    placesByNormalized: new Map([["little rock", [littleRock]]]),
    aliasesByNormalized: new Map([
      ["lr", [{ countyId: "c-pulaski", placeAuthorityId: "p-lr" }]],
    ]),
  };
}

describe("geography reconcile", () => {
  it("matches authoritative county FIPS", () => {
    const r = reconcileGeography({ authoritativeId: "05119" }, index());
    expect(r.matchMethod).toBe("AUTHORITATIVE_ID");
    expect(r.outcome).toBe("EXACT");
    expect(r.countyId).toBe("c-pulaski");
  });

  it("matches authoritative place GEOID", () => {
    const r = reconcileGeography({ authoritativeId: "0541000" }, index());
    expect(r.matchMethod).toBe("AUTHORITATIVE_ID");
    expect(r.placeAuthorityId).toBe("p-lr");
    expect(r.countyId).toBe("c-pulaski");
  });

  it("rejects title-only without county context", () => {
    const r = reconcileGeography({ rawText: "Little Rock" }, index());
    expect(r.outcome).toBe("UNMATCHED");
    expect(r.evidence.reason).toBe("TITLE_ONLY_OR_MISSING_CONTEXT");
  });

  it("exact+context match", () => {
    const r = reconcileGeography(
      { rawText: "Little Rock", countyContext: "Pulaski" },
      index(),
    );
    expect(r.matchMethod).toBe("EXACT_NORMALIZED");
    expect(r.outcome).toBe("EXACT");
    expect(r.placeAuthorityId).toBe("p-lr");
  });

  it("alias match", () => {
    const r = reconcileGeography(
      { rawText: "LR", countyContext: "05119" },
      index(),
    );
    expect(r.matchMethod).toBe("ALIAS");
    expect(r.placeAuthorityId).toBe("p-lr");
  });

  it("operator confirmed", () => {
    const r = reconcileGeography(
      {
        operatorConfirmed: true,
        operatorCountyId: "c-pulaski",
        operatorPlaceAuthorityId: "p-lr",
      },
      index(),
    );
    expect(r.matchMethod).toBe("OPERATOR_CONFIRMED");
    expect(r.outcome).toBe("MAPPED");
  });
});
