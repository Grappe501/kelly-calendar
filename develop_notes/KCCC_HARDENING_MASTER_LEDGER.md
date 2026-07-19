# KCCC Hardening Master Ledger

**Script ID:** `KCCC-HARDENING-MASTER-LEDGER`  
**Status:** ACTIVE (seeded — consolidates as audit streams complete)  
**Parent:** `KCCC_HARDENING_PASS.md`  
**Rule:** Single authoritative remediation backlog for Audit → Hardening. Stream reports remain evidence; **this ledger** is the planning surface.

```text
Before Hardening begins:
Consolidate findings from all twelve audit streams here.
```

## Columns

| Field | Meaning |
|-------|---------|
| ID | Stable ledger ID |
| Source | Audit stream + finding ID |
| Severity | Critical · High · Medium · Low |
| Arch impact | None · Hygiene · Dangerous · Doctrine risk |
| User impact | None · Low · Medium · High |
| Effort | S · M · L |
| Target phase | Hardening · Redesign · Foundation · Version 2 |
| Status | Open · Blocked · Done · Deferred |

---

## Ledger (seeded from EA-1 + EA-4)

| ID | Source | Summary | Severity | Arch impact | User impact | Effort | Target phase | Status |
|----|--------|---------|----------|-------------|-------------|--------|--------------|--------|
| HL-001 | EA-1 H-AC-02 | Stop forcing `candidateAttending: true`; prefer Confirmed / Invited / Tentative / Unknown / N/A | **Critical** | **Dangerous** (false certainty) | High | M | Hardening | Open |
| HL-002 | EA-1 H-AC-01 | Label derived %/density/heat as presentation — never domain readiness | High | Hygiene | High | S | Hardening (+ Redesign copy) | Open |
| HL-003 | EA-4 / R-AC-07 | Compact Unknown presentation (“awaiting data”) — do not fabricate | High | None (presentation) | High | M | Redesign | Open |
| HL-004 | EA-4 XR-01 | Persistent “What Matters Now?” Executive Hero Layer | High | None | **Critical UX** | L | Redesign | Open |
| HL-005 | EA-1 H-AC-04 | Calendar → Mission Workspace → Mutation → Return; demote hosted MissionDayActions | Medium | Hygiene (UI ownership blur) | Medium | M | Hardening / Redesign | Open |
| HL-006 | EA-1 H-AC-03 | Shared Week/Month calendar assembly helper | Medium | Hygiene (drift) | Low | M | **Foundation** (prereq) | Open |
| HL-007 | EA-1 H-AC-06 | Catalogue-bound disclosure in hero | Medium | Hygiene | Medium | S | Redesign (with XR-01) | Open |
| HL-008 | EA-1 H-AC-05 | Deepen county/candidate links when IDs exist | Low | Hygiene | Medium | S | Hardening | Open |
| HL-009 | EA-4 | Visual hierarchy / legend / campaign identity (comprehension backlog) | Medium | None | High | L | Redesign | Open |

---

## Severity guidance (this program)

| Severity | Use when |
|----------|----------|
| Critical | False certainty / Trust Model break / security / data loss |
| High | Operator confuses presentation with domain truth; primary cognition failure |
| Medium | Drift, duplicated logic, shallow navigation, polish that blocks confidence |
| Low | Nice-to-have consistency |

## Target fitness

```text
EA-1 baseline ............... 7.9
Hardening exit target ....... 8.8+
V2 maintain ................. ≥ 9.0
```

## Intake rule

When an audit stream closes, add rows here within the same pass. Do **not** leave remediation only inside the stream report.

## Streams not yet ingested

EA-2 · EA-3 · EA-5 · EA-6 · EA-7 · EA-8 · EA-9 · EA-10 · EA-11 · EA-12 — append on completion.

## Hardening gate

Hardening implementation remains **BLOCKED** until Engineering Audit exit (or Steve waiver). Ledger may grow while audits run.
