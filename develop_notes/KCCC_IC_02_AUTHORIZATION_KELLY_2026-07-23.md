# Kelly Authorization — IC-02 RedDirt Read Integration

```text
Decision ID:   ADR-104
Authority:     Kelly Grappe
Date:          2026-07-23
Status:        ACCEPTED
Scope:         IC-02 only
Prerequisites: ADR-101 · ADR-102 (IC-01 COMPLETE) · ADR-103
Program:       Phase Two — Intelligent Statewide Campaign Calendar
Standing:      ADR-094 ship cycle applies to the authorized IC-02 script
Baseline:      IC-01 feature 53d0f01 · counties 75 · places 250
```

## Decision

Kelly explicitly authorizes implementation and full ship cycle of **IC-02: RedDirt Read Integration** only — including planning, additive schema/migration, validation, documentation, commit, push, Netlify deployment, corrective follow-ups, redeployment, and live verification — under standing execution **ADR-094**, subject to the boundaries below.

This authorization does **not** absorb IC-03…IC-12. It does **not** reopen IC-01.

## Authorized (IC-02)

- Server-only, read-only RedDirt connection configuration and status
- Credential verification using documented read operations when a verified contract exists
- Capability discovery (documented vs credential-tested vs application-enabled)
- Bounded read-only synchronization and/or approved RedDirt export ingestion
- Dry-run normalization, privacy allowlisting, and IC-01 geographic reconciliation
- Operator review of ambiguous or conflicting records
- Explicit application of approved strategic geography facts with provenance
- Freshness, deletion marking, audit history, and idempotent refreshes
- Restrained strategic context on calendar / geography surfaces
- Documentation, rollback notes, constants, and durable validator

## Forbidden in IC-02 (hard boundaries)

| Boundary | Rule |
|----------|------|
| RedDirt writes | **No** POST/PUT/PATCH/DELETE to RedDirt |
| OpenAI | **No OpenAI calls** — zero model invocations in IC-02 |
| People | **No** person-level import, Person create, consent inference |
| Events / Missions | **No** create/update/delete of Events or Missions from RedDirt |
| Mobilize | **No** Mobilize activation or write paths |
| IC-01 reopen | **Do not** re-seed or rewrite IC-01 authority data as IC-02 work |
| IC-03…IC-12 | **Not authorized** — each requires its own sequenced authorization |
| Secrets | **No** `NEXT_PUBLIC_REDDIRT_*`; never store API keys in DB or client |

## Binding constraint

RedDirt is a **read-only intelligence source**. IC-01 owns canonical Arkansas geographic identity (FIPS / place GEOID). A RedDirt score or priority remains labeled as RedDirt-sourced — never presented as objective system truth. Missing credentials ship as `NOT_CONFIGURED` with fixture/export paths for tests — not fabricated live verification.

## Sequencing

```text
ADR-101 owner acceptance
  → ADR-103 AI quality gate (foundation)
  → ADR-102 IC-01 COMPLETE (53d0f01)
  → ADR-104 IC-02 authorization (this document)
  → IC-02 implement / validate / ship
  → IC-03…IC-12 only under later ADRs
```

## Relationship to prior ADRs

| ADR | Role |
|-----|------|
| ADR-093 | Vision lock — IC sequence |
| ADR-094 | Standing ship execution |
| ADR-101 | Product-owner acceptance of CC-01…CC-12 baseline |
| ADR-102 | IC-01 COMPLETE |
| ADR-103 | AI quality gate (foundation) |
| **ADR-104** | **IC-02 only** |

## Authorization quote (operator)

> I, Kelly, authorize **IC-02: RedDirt Read Integration** only. IC-03 through IC-12 remain separately sequenced. IC-02 must not write to RedDirt, call OpenAI, import people, infer consent, or mutate Events or Missions.
