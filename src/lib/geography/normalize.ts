/**
 * Deterministic Arkansas geography name normalization (IC-01).
 */

export function normalizeGeographyToken(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bst\.?\b/g, "saint")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Strip common place suffixes for comparison (city/town/cdp). */
export function stripPlaceSuffix(normalized: string): string {
  return normalized
    .replace(
      /\b(city|town|cdp|census designated place|census place|municipality)\b$/g,
      "",
    )
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeCountyName(input: string): string {
  let n = normalizeGeographyToken(input);
  n = n.replace(/\bcounty\b$/g, "").trim();
  return n;
}

export function normalizePlaceName(input: string): string {
  return stripPlaceSuffix(normalizeGeographyToken(input));
}

export function slugifyGeographyName(input: string): string {
  return normalizeGeographyToken(input).replace(/\s+/g, "-");
}
