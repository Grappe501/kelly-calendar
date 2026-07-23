# IC-02 Design Handoff — RedDirt Read Integration

```text
Status:       DESIGN HANDOFF ONLY — NOT IMPLEMENTED
Authorization: NOT_AUTHORIZED (requires post–IC-01 ADR)
Predecessor:  IC-01 Arkansas Campaign Geography Foundation (ADR-102) COMPLETE
Program:      Phase Two · KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md
```

## Intent (from Phase Two program)

**IC-02 — RedDirt Read Integration:** server-only, **read-first** RedDirt adapter. No blind sync. No AI direct database access.

## Why this handoff exists

IC-01 shipped the deterministic Arkansas geography authority (75 counties · top 250 places · reconciliation links) **without** any RedDirt credentials, client, or import path. IC-02 is the first authorized moment to attach RedDirt **reads** onto that foundation.

## Pre-build inspection checklist (Burt / implementer)

Before writing adapter code, inspect and document:

1. RedDirt API / service docs and auth model (server-only secrets)
2. Objects and fields available for counties, cities/places, contacts, volunteers, participation
3. Tags / focus areas and how they relate to campaign geography
4. Timestamps, pagination, rate limits, export restrictions
5. Consent / suppression / permitted-use constraints
6. How RedDirt county/city identifiers map to Census FIPS / place GEOIDs from IC-01

## Expected build shape (when authorized)

| Capability | Notes |
|------------|-------|
| External identity mapping | Map RedDirt ids → `ArkansasCounty` / `GeographyPlaceAuthority` (never replace FIPS as primary authority) |
| Dry-run imports | Preview-only before any write of mapping tables |
| Provenance | Every imported link carries source + retrieval time |
| Incremental checkpoints | Resume-safe imports |
| Conflict detection | Ambiguous county/place matches surface to operators |
| Data minimization | Pull only fields needed for calendar/mission geography |
| Privacy / role restrictions | Leadership-gated; no anonymous RedDirt proxy |
| Audit | Import runs ledger (extend `GeographyImportRun` or sibling) |

## Hard rules (carry forward)

- No blind sync
- No OpenAI calls that invent geography or priority
- No person-level import without consent-aware Person authority (later IC)
- No Event/Mission schedule mutation from RedDirt reads
- No Mobilize activation in IC-02
- Do not import RedDirt source into Kelly-calendar client bundles

## RedDirt geography touchpoints (read-only reference — not wired)

Informative paths observed in the RedDirt lane (do not copy code across lanes without an approved integration packet):

- Docs: `geographic-targeting-model`, `geographic-unification-foundation`, `geographic-county-mapping`
- Lib: county registry / campaign regions / maps city centers / travel-ledger city aliases
- Data: election county targets / related county workbench artifacts

These are **inspection targets**, not dependencies of IC-01.

## Explicit non-implementation

This document does **not** authorize:

- Prisma models for RedDirt sync
- Env vars for RedDirt credentials in Kelly-calendar
- Network calls to RedDirt
- UI that pretends RedDirt is connected

`IC_02_STATUS` remains **`NOT_AUTHORIZED`** until a separate Kelly ADR after IC-01 ship evidence is accepted.

## Suggested next authorization packet

When ready: Kelly ADR for IC-02 only · inspection report attached · dry-run proof plan · rollback note · constants flip `NEXT_AUTHORIZED_BUILD` / `IC_02_STATUS`.
