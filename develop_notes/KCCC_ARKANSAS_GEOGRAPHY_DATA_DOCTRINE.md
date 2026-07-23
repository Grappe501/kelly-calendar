# Arkansas Geography Data Doctrine

```text
Program:  Phase Two IC-01
Status:   ACTIVE
Binding:  ADR-102 · ADR-103
```

## Purpose

Define how Arkansas geography authority is sourced, ranked, normalized, versioned, and linked — so operators and engineers share one truth about what “county” and “place” mean in KCCC.

## Authority layers

| Layer | Owner | Examples |
|-------|-------|----------|
| **Public authority** | Census / ANSI / published seats | County FIPS, place GEOID, 2020 Decennial population |
| **Campaign policy** | Campaign leadership | Priorities, focus areas, regions, corridors |
| **Reconciliation evidence** | Deterministic matcher + operator confirm | `EventGeography` / `MissionGeography` |
| **External systems** | Future IC builds | RedDirt (IC-02+), Mobilize (IC-10+) — **not** IC-01 |

Public authority never silently becomes campaign policy. Policy never pretends to be Census.

## Vintage rules

- County FIPS / place GEOIDs: Census **2020** ANSI / Places geography.
- Place population ranking: Census **2020 Decennial** only.
- Do **not** mix ACS yearly estimates into the top-250 rank without a new definition id and ADR.
- County seats: published primary seat vintage recorded in the source register; dual-seat counties stay explicitly limited.

## Top-250 definition

Id: `AR_CENSUS_PLACES_TOP250_POP_2020`

- Universe: Arkansas incorporated places + CDPs
- Rank: descending Census 2020 Decennial population
- Tie-break: `censusPlaceGeoid` ascending
- Count: exactly **250**
- Not a venue list; not a mailing list; not voter-file geography

## Normalization

- County and place names normalize for matching (case, punctuation, County/Parish suffix handling as implemented in `src/lib/geography/normalize.ts`).
- Matching never uses Event **title alone** — require authoritative id, or place text **plus** county context, or operator confirmation.

## Provenance

Every seed row and every priority/focus overlay must be attributable via `GeographySource` / `sourceKey` and content fingerprints in `data/geography/arkansas-geography-source-register.json`.

## Mutation boundaries

| Allowed | Forbidden |
|---------|-----------|
| Upsert authority / policy geography tables | Mutate Event/Mission schedule fields |
| Write EventGeography / MissionGeography | Create Events/Missions from geography UI |
| Supersede prior active geography links | Blind RedDirt sync; OpenAI priority |

## Change control

- Changing the top-250 definition, FIPS vintage, or ranking method requires a new definition id and documentation update.
- Re-seed must remain idempotent (`countiesCreated=0` / `placesCreated=0` on second run when unchanged).
- IC-02 RedDirt read integration must map external ids onto this authority — it must not replace Census FIPS as the primary key space without a later ADR.
