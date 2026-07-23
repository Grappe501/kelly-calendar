# IC-01 — Arkansas Campaign Geography Foundation

```text
Build:         KCCC-IC-01-ARKANSAS-CAMPAIGN-GEOGRAPHY-FOUNDATION-1.0
Authorization: ADR-102
Standing:      ADR-094
Migration:     20260723120000_ic01_arkansas_campaign_geography_foundation
AI:            Zero OpenAI calls (forbidden)
RedDirt:       None (IC-02+)
```

## Mission

Give the campaign an authoritative, provenance-tagged Arkansas geography foundation — 75 counties, top 250 Census places, regions, travel corridors, county priorities, and focus areas — with Event/Mission geography reconciliation that never mutates schedule fields.

## Doctrine

- Deterministic authority graph only (Census FIPS / place GEOIDs + campaign policy overlays)
- Every priority / focus / reconciliation row carries a source key
- County/city prioritization remains **campaign policy** — never silent AI
- Reconciliation writes `EventGeography` / `MissionGeography` only
- Never create, update, or delete `Event` / `CampaignMission` schedule, status, title, or location text
- No RedDirt adapter, Mobilize, people-platform, or OpenAI in this build
- Idempotent seed and idempotent reconcile (same evidence fingerprint → duplicate apply = no new active row)

## Models (Prisma)

| Model | Role |
|-------|------|
| `ArkansasCounty` (extended) | 75 AR counties · FIPS/geoid · seat · normalized name |
| `GeographyPlaceAuthority` | Top-250 Census places planning universe |
| `GeographyPlaceCounty` | Place↔county links (primary + additional) |
| `GeographyAlias` | Operator/public aliases for matching |
| `CampaignGeographyRegion` / `…Member` | Campaign regions |
| `CampaignTravelCorridor` / `…Node` | Travel corridors |
| `CampaignCountyPriority` | Policy priorities with provenance |
| `CampaignFocusArea` / `…Geography` | Focus overlays |
| `EventGeography` | Event↔authority link (active/superseded) |
| `MissionGeography` | Mission↔authority link (active/superseded) |
| `GeographySource` | Source register rows |
| `GeographyImportRun` | Seed/import run ledger |
| `GeographyReconciliationCandidate` | Optional candidate queue |

## Authority counts (seed)

| Entity | Count |
|--------|------:|
| Counties | 75 |
| Places (top 250) | 250 |
| Census vintage | 2020 Decennial / ANSI county codes |

Definition: `src/lib/geography/top250-definition.ts` · `AR_CENSUS_PLACES_TOP250_POP_2020`.

## Reconciliation

Match order (never title-only):

1. Operator confirmed  
2. Authoritative id (5-digit county FIPS / 7-digit place GEOID)  
3. Exact normalized place + county context  
4. Alias  
5. County-context fallback / unmatched  

APIs:

- `POST /api/geography/reconciliation/preview`
- `POST /api/geography/reconciliation/apply`

Apply is fingerprint-gated and supersedes prior active rows for the same subject without touching Event `startsAt` / Mission schedule.

## Operator surfaces

| Kind | Path |
|------|------|
| UI | `/system/geography` (dashboard) |
| UI | `/system/geography/counties` · `/places` · `/regions` · `/corridors` · `/priorities` · `/focus-areas` · `/reconciliation` · `/sources` |
| API | `/api/geography/dashboard` · `/counties` · `/places` · `/regions` · `/corridors` · `/priorities` · `/focus-areas` · `/sources` |

Leadership session required. Unauthenticated UI → login redirect; API → 401.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run geography:foundation:seed` | Idempotent seed from `data/geography/*` |
| `npm run geography:foundation:validate` | File/schema/count/unit gate |
| `scripts/generate-arkansas-geography-data.mjs` | Offline data generator |
| `scripts/apply-ic01-geography-migration.mjs` | Migration helper |

## Docs

| Doc | Role |
|-----|------|
| `KCCC_IC_01_AUTHORIZATION_KELLY_2026-07-23.md` | ADR-102 |
| `KCCC_IC_01_ARKANSAS_CAMPAIGN_GEOGRAPHY_FOUNDATION_ROLLBACK.md` | Rollback |
| `KCCC_IC_01_GEOGRAPHY_OPERATOR_GUIDE.md` | Operator how-to |
| `KCCC_IC_01_GEOGRAPHY_SOURCE_REGISTER.md` | Provenance citations |
| `KCCC_ARKANSAS_GEOGRAPHY_DATA_DOCTRINE.md` | Data doctrine |
| `KCCC_IC_02_DESIGN_HANDOFF.md` | Next build (not implemented) |

## CC-07 search note

CC-07 already accepts `countyIds` against `Event.countyId`. Full **EventGeography-backed** search facets remain deferred — county labels live on the geography workspace until a later authorized pass wires geography links into search without breaking query-schema v1.

## Hard boundaries (IC-01)

| Forbidden | Rule |
|-----------|------|
| OpenAI | Zero model invocations |
| RedDirt | No adapter / credentials / sync / import |
| Mobilize | No activation or write paths |
| People platform | No volunteer/contact identity build-out |
| Auto priority | No silent AI county/city policy |
| Event/Mission create | No creating Events or Missions from geography |
| IC-02…IC-12 | Not authorized |

## Validator

`npm run geography:foundation:validate`

## Ship evidence

| | |
|--|--|
| Migration | `20260723120000_ic01_arkansas_campaign_geography_foundation` |
| Authorization | ADR-102 |
| Status | COMPLETE |
| Feature commit | *(filled at ship)* |
| Netlify deploy | *(filled at ship)* |
| Counties / places | 75 / 250 |
| Event schedule mutations from reconcile | **0** |
| OpenAI / RedDirt / Mobilize | **0** |
