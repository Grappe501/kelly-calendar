# Kelly Authorization — Phase Two Vision Lock

```text
Decision ID:   ADR-093
Authority:     Kelly Grappe
Date:          2026-07-22
Status:        ACCEPTED
Program:       Phase Two — Intelligent Statewide Campaign Calendar (IC-01…IC-12)
```

## Decision

After Calendar Completion **CC-12**, Kelly Calendar enters a major second phase while remaining **calendar-centered**.

The product vision is no longer merely “a better calendar.” It is:

> An intelligent statewide campaign operating calendar that understands why every Mission matters, detects geographic and strategic gaps, coordinates volunteers and travel, and invites immediate mobile action.

Provisional numbering: **IC-01 through IC-12**.

## Binding sequencing

1. **Finish CC-07 through CC-12 intact** before implementing Phase Two features.
2. Architecture for IC-01…IC-12 **may be designed** during CC-07…CC-12.
3. Phase Two **must not** destabilize the calendar by premature implementation.
4. A dedicated **operator-usability and AI-quality gate** is required **before IC phase authorization** (after CC-12).

### Protected build sequence

```text
CC-07 → CC-08 → CC-09 → CC-10 → CC-11 → CC-12
  → usability / AI-quality gate
  → IC phase authorization
  → IC-01…IC-12
```

### Extension points during CC-07…CC-12 (allowed)

Implementation may add **clean extension points** only, for example:

- Query contracts
- Design tokens
- Mobile-safe layouts
- Provider-neutral interfaces
- Geographic identifiers

### Hard stop during CC-07…CC-12

Must **not**:

- Introduce hidden Phase Two features
- Widen data collection beyond Calendar Completion needs
- Start IC-01…IC-12 product surfaces or RedDirt/Mobilize write paths

### Next engineering action

Requires **separate authorization** for **CC-07: Unified Search, Filters, and Saved Views**.  
CC-07 remains design-only and unauthorized until that decision is recorded.

## Authoritative posture snapshot (2026-07-22)

| Item | Value |
|------|-------|
| Git tip (Kelly-confirmed) | `main` @ `68d6476` |
| Posture lock commit | `203bfe3` (this boundary reinforcement) |
| Phase Two | ADR-093 — vision/architecture only |
| IC-01…IC-12 | No implementation before CC-12 |
| CC-07 | Design-only · unauthorized |
| Usability Synthesis | EMPTY |
| Production behavior | Unchanged by this posture |
## Governing AI principle (binding)

> AI should understand and explain the campaign, but **deterministic services** must establish facts, authorization, consent, coverage, conflicts, and permissible actions.

AI suggestions never silently become Events, Missions, assignments, contacts, or external writes. Apply / external actions always require fresh human confirmation.

## Relationship to prior ADRs

| ADR | Remains |
|-----|---------|
| ADR-090 | CC-05 waiver only |
| ADR-091 | Usability Pass / Synthesis still required for evidence; Synthesis remains EMPTY until filled |
| ADR-092 | CC-06 authorization only |
| ADR-093 | This Phase Two lock — does **not** authorize IC implementation yet |

## Program document

`develop_notes/KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md`
