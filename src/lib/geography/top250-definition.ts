/**
 * Top-250 Arkansas Census places planning definition (IC-01).
 */
export const TOP250_PLACES_DEFINITION = {
  id: "AR_CENSUS_PLACES_TOP250_POP_2020",
  label: "Arkansas Top 250 Census Places (Planning)",
  stateFips: "05",
  count: 250,
  populationVintage: "Census 2020 Decennial",
  geographyVintage: "Census 2020 Places",
  universe: "Incorporated places (cities/towns) and Census Designated Places (CDPs) in Arkansas",
  ranking: "Descending population (Census 2020 Decennial)",
  tieBreak: "censusPlaceGeoid ascending",
  notes:
    "Planning universe for IC-01. Not a venue list. ACS estimates are not used for ranking.",
} as const;

export type Top250PlacesDefinition = typeof TOP250_PLACES_DEFINITION;
