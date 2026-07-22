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
4. A dedicated **operator-usability and AI-quality gate** is required before enabling broader automation after IC-01…IC-12.

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
