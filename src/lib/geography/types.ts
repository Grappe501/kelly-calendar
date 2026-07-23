/**
 * IC-01 geography types — pure, no Prisma.
 */

export type GeographyMatchMethod =
  | "AUTHORITATIVE_ID"
  | "EXACT_NORMALIZED"
  | "ALIAS"
  | "OPERATOR_CONFIRMED"
  | "CONTEXT_COUNTY"
  | "UNMATCHED";

export type GeographyMatchOutcome =
  | "EXACT"
  | "MAPPED"
  | "AMBIGUOUS"
  | "UNMATCHED"
  | "SUPERSEDED";

export type GeographySeatReviewState = "CONFIRMED" | "NEEDS_REVIEW";

export type GeographyProvenance =
  | "CAMPAIGN_ENTERED"
  | "PUBLIC_DATA"
  | "HISTORICAL_ACTIVITY"
  | "OPERATOR_JUDGMENT";

export type CountyAuthorityRecord = {
  name: string;
  slug: string;
  fipsCode: string;
  stateFips: string;
  geoid: string;
  countySeat: string;
  normalizedName: string;
};

export type PlaceAuthorityRecord = {
  name: string;
  placeType: "city" | "town" | "cdp" | "census_place" | string;
  censusPlaceGeoid: string;
  population: number;
  populationRank: number;
  primaryCountyFips: string;
  additionalCountyFips: string[];
};

export type GeographyReconcileInput = {
  /** Census place GEOID (7-digit) or county FIPS (5-digit). */
  authoritativeId?: string | null;
  rawText?: string | null;
  /** Optional county FIPS / name context — never title-only. */
  countyContext?: string | null;
  /** Operator override when matchMethod is OPERATOR_CONFIRMED. */
  operatorCountyId?: string | null;
  operatorPlaceAuthorityId?: string | null;
  operatorConfirmed?: boolean;
};

export type GeographyAuthorityIndex = {
  countiesByFips: Map<string, { id: string; fipsCode: string; normalizedName: string; name: string }>;
  countiesByNormalized: Map<string, { id: string; fipsCode: string; normalizedName: string; name: string }[]>;
  placesByGeoid: Map<string, { id: string; censusPlaceGeoid: string; normalizedName: string; name: string; primaryCountyFips?: string | null }>;
  placesByNormalized: Map<string, { id: string; censusPlaceGeoid: string; normalizedName: string; name: string; primaryCountyFips?: string | null }[]>;
  aliasesByNormalized: Map<string, { countyId?: string | null; placeAuthorityId?: string | null }[]>;
};

export type GeographyReconcileResult = {
  matchMethod: GeographyMatchMethod;
  outcome: GeographyMatchOutcome;
  countyId: string | null;
  placeAuthorityId: string | null;
  evidence: Record<string, unknown>;
};
