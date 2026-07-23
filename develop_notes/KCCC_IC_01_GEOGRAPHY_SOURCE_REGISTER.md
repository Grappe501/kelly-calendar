# IC-01 Geography Source Register

```text
Build:     KCCC-IC-01-ARKANSAS-CAMPAIGN-GEOGRAPHY_FOUNDATION-1.0
Purpose:   Human-readable provenance for Arkansas geography foundation datasets
Machine:   data/geography/arkansas-geography-source-register.json
Doctrine:  develop_notes/KCCC_ARKANSAS_GEOGRAPHY_DATA_DOCTRINE.md
```

## Local artifacts

| Path | Role |
|------|------|
| `data/geography/arkansas-counties-authority.json` | 75 Arkansas counties (FIPS/geoid, seat, normalized name) |
| `data/geography/arkansas-top250-places-planning.json` | Top 250 Census places planning universe |
| `data/geography/arkansas-geography-source-register.json` | Machine source register + content fingerprints |

## Cited sources

### 1. Census / ANSI Arkansas counties (FIPS)

| Field | Value |
|-------|-------|
| `sourceKey` | `census-ar-counties-fips-2020` |
| Publisher | U.S. Census Bureau |
| Title | Arkansas County FIPS / ANSI codes |
| URL | https://www.census.gov/library/reference/code-lists/ansi.html |
| Vintage | **2020** |
| Retrieval | 2026-07-23 |
| Local path | `data/geography/arkansas-counties-authority.json` |
| Fingerprint | `cd714ec7f42908e307eb19ed7c17fdeb6e32cffecef24883b6b63691f212b871` |

State FIPS `05`. County GEOID = 5-digit FIPS (`05` + county).

### 2. Census Arkansas places population (Decennial 2020)

| Field | Value |
|-------|-------|
| `sourceKey` | `census-ar-places-pop-2020` |
| Publisher | U.S. Census Bureau |
| Title | Arkansas Census Places population (Decennial 2020) |
| URL | https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html |
| Vintage | **2020 Decennial** |
| Retrieval | 2026-07-23 |
| Local path | `data/geography/arkansas-top250-places-planning.json` |
| Fingerprint | `ba07ed7ae587eb421314a4d44b11a174b55eac14f3b9d55f05a37d1c7afb139e` |

Ranking definition id: `AR_CENSUS_PLACES_TOP250_POP_2020` (descending 2020 Decennial population; tie-break `censusPlaceGeoid` ascending). ACS estimates are **not** used for ranking.

### 3. Arkansas county seats (primary)

| Field | Value |
|-------|-------|
| `sourceKey` | `ar-county-seats-primary` |
| Publisher | Arkansas county governments / SOS listings |
| Title | Arkansas county seats (primary) |
| URL | https://www.arkansas.gov/ |
| Vintage | **2024** |
| Retrieval | 2026-07-23 |
| Local path | `data/geography/arkansas-counties-authority.json` (seat fields) |
| Fingerprint | same counties authority file as above |

Dual-seat counties list the historically primary / commonly cited seat only (`seatReviewState` may mark review).

## Campaign-entered overlays

Regions, corridors, county priorities, and focus areas are **campaign policy** rows. Each must carry a `sourceKey` / provenance tag when entered. They are not Census authority.

## Forbidden as silent authority

- AI-suggested priorities without operator confirmation
- RedDirt imports (IC-02+)
- Unsourced opponent claims or fabricated populations
