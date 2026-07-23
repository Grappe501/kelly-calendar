# Kelly Authorization — IC-01 Arkansas Campaign Geography Foundation

```text
Decision ID:   ADR-102
Authority:     Kelly Grappe
Date:          2026-07-23
Status:        ACCEPTED
Scope:         IC-01 only
Prerequisites: ADR-101 (owner acceptance) · ADR-103 (AI quality foundation gate)
Program:       Phase Two — Intelligent Statewide Campaign Calendar
Standing:      ADR-094 ship cycle applies to the authorized IC-01 script
```

## Decision

Kelly explicitly authorizes implementation and full ship cycle of **IC-01: Arkansas Campaign Geography Foundation** only — including planning, schema/migration (when separately executed), validation, documentation, commit, push, Netlify deployment, corrective follow-ups, redeployment, and live verification — under standing execution **ADR-094**, subject to the boundaries below.

This authorization becomes effective after ADR-101 and ADR-103 are recorded. It does **not** absorb IC-02…IC-12.

## Authorized (IC-01)

- Arkansas geography foundation: counties, places/communities, regions, travel corridors, county seats, campaign geographic tiers / focus areas as designed for IC-01
- Provenance / source tagging for geographic priorities (campaign-entered · public data · historical activity · operator judgment — **not** silent AI priority)
- Relationships from Event / Mission / volunteer / contact geography **identifiers** as extension points (no people-platform build-out in IC-01)
- Deterministic validators and operator-facing geography read surfaces in scope of the IC-01 script
- Documentation, rollback notes, and constants reflecting IC-01 progress

## Forbidden in IC-01 (hard boundaries)

| Boundary | Rule |
|----------|------|
| OpenAI | **No OpenAI calls** — zero model invocations in IC-01 |
| RedDirt | **No** RedDirt adapter, credentials, sync, or import (IC-02+) |
| Mobilize | **No** Mobilize activation or write paths (IC-10+) |
| People platform | **No** volunteer/contact identity system build-out (IC-08+) |
| Auto priority | **No** AI or automated silent county/city prioritization as campaign policy |
| Event / Mission create | **No** creating Events or Missions from geography features |
| IC-02…IC-12 | **Not authorized** — each requires its own sequenced authorization |

## Binding constraint

IC-01 is a **deterministic geography foundation**. County/city prioritization remains **campaign policy**. AI does not silently decide who matters. Phase Two AI surfaces remain disabled pending per-feature eval (ADR-103).

## Sequencing

```text
ADR-101 owner acceptance
  → ADR-103 AI quality gate (foundation)
  → ADR-102 IC-01 authorization (this document)
  → IC-01 implement / validate / ship
  → IC-02…IC-12 only under later ADRs
```

## Relationship to prior ADRs

| ADR | Role |
|-----|------|
| ADR-093 | Vision lock — IC sequence |
| ADR-094 | Standing ship execution |
| ADR-101 | Product-owner acceptance of CC-01…CC-12 baseline |
| ADR-103 | AI quality gate accepted for foundation (not feature enablement) |
| **ADR-102** | **IC-01 only** |

## Authorization quote (operator)

> I, Kelly, authorize **IC-01: Arkansas Campaign Geography Foundation** only. IC-02 through IC-12 remain separately sequenced. IC-01 must not call OpenAI, integrate RedDirt or Mobilize, build the people platform, auto-set geographic priority as silent policy, or create Events/Missions.
