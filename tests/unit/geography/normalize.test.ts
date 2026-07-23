import { describe, expect, it } from "vitest";
import {
  normalizeCountyName,
  normalizePlaceName,
  normalizeGeographyToken,
  slugifyGeographyName,
} from "@/lib/geography/normalize";

describe("geography normalize", () => {
  it("normalizes St. Francis county", () => {
    expect(normalizeCountyName("St. Francis County")).toBe("saint francis");
  });

  it("normalizes place with city suffix", () => {
    expect(normalizePlaceName("Little Rock City")).toBe("little rock");
  });

  it("slugifies names", () => {
    expect(slugifyGeographyName("Hot Spring")).toBe("hot-spring");
  });

  it("collapses punctuation and case", () => {
    expect(normalizeGeographyToken("  Helena–West Helena ")).toMatch(/helena/);
  });
});
