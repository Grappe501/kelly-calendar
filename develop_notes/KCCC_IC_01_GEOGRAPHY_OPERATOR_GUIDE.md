# IC-01 Geography Operator Guide

```text
Build:    KCCC-IC-01-ARKANSAS-CAMPAIGN-GEOGRAPHY-FOUNDATION-1.0
Audience: Campaign leadership operators
Auth:     Leadership session required
```

## What this is

Arkansas campaign geography is the authoritative planning graph for counties and the top 250 Census places. It does **not** change calendar Events or Missions by itself. Reconciliation only attaches geography links.

## Open the workspace

1. Sign in as campaign leadership.
2. Go to **`/system/geography`** (also linked from Calendar integrity).
3. Use Counties · Places · Regions · Corridors · Priorities · Focus areas · Sources.

## Read counties and places

- **Counties** — all 75 Arkansas counties with FIPS/geoid and county seat.
- **Places** — top 250 Census places (2020 Decennial population ranking). Open a place to see primary/additional counties.
- Seats marked for dual-seat counties list the historically primary / commonly cited seat only.

## Priorities and focus areas

- County priorities and focus areas are **campaign policy** overlays with a source tag.
- Do not invent priorities. Enter them with an honest source (campaign-entered, public data, historical activity, operator judgment).
- AI must never silently set who matters (ADR-102 / ADR-103).

## Reconciliation (Event / Mission)

1. Open **Reconciliation** or call the APIs.
2. **Preview** first: `POST /api/geography/reconciliation/preview` with `subjectType` (`EVENT`|`MISSION`), `subjectId`, and match inputs:
   - Prefer `authoritativeId` (5-digit county FIPS or 7-digit place GEOID), or
   - `rawText` **plus** `countyContext` (never title-only), or
   - `operatorConfirmed` with operator county/place ids.
3. Confirm the preview outcome (`EXACT` / `MAPPED` / `AMBIGUOUS` / `UNMATCHED`).
4. **Apply** with the same body plus the returned `fingerprint`: `POST /api/geography/reconciliation/apply`.
5. Re-applying the same fingerprint is **idempotent** (no duplicate active link). Prior active links for that subject are superseded.

### Guarantees

- Event `startsAt` / Mission schedule fields are **unchanged**.
- Only `EventGeography` / `MissionGeography` rows are written.
- Ambiguous matches should be resolved by operator confirmation, not guessed.

## Search / calendar filters

CC-07 already supports `countyIds` on `Event.countyId`. Full filtering via EventGeography links is not required for day-to-day geography browsing — use this workspace for county/place labels until a later pass extends search.

## What not to do

- Do not expect geography pages to create Events or Missions.
- Do not connect RedDirt credentials here (that is IC-02, not authorized).
- Do not call OpenAI for prioritization.
- Do not hard-delete authority rows; supersede or deactivate with approval.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Redirect to login | Session missing / expired |
| API 401 | Unauthenticated |
| API 403 | Not leadership role |
| UNMATCHED preview | Missing county context or unknown place |
| AMBIGUOUS preview | Multiple places share the name — confirm operator ids |
| Fingerprint mismatch | Inputs changed after preview — preview again |
