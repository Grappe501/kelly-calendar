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
| ID | Stable ledger ID (`HL-*`) |
| Tag | `H-AC` · `HC-COG` · `EA-4` / `XR` · other |
| Source | Audit stream + finding ID |
| Severity | Critical · High · Medium · Low |
| Arch impact | None · Hygiene · Dangerous · Doctrine risk |
| User impact | None · Low · Medium · High |
| Effort | S · M · L |
| Target phase | Hardening · Redesign · Foundation · Version 2 |
| Status | Open · Blocked · Done · Deferred |

### Tag: `HC-COG` (cognition / decision-making)

Keeps UX cognition issues distinct from architecture or visual styling.

Examples: `HC-COG-001` Priority not obvious · `HC-COG-002` Equal-weight panels · `HC-COG-003` Decision below fold · `HC-COG-004` Navigation depth / dead controls · `HC-COG-005` Action lacks context.

---

## Ledger

| ID | Tag | Source | Summary | Severity | Arch impact | User impact | Effort | Target phase | Status |
|----|-----|--------|---------|----------|-------------|-------------|--------|--------------|--------|
| HL-001 | H-AC | EA-1 H-AC-02 | Stop forcing `candidateAttending: true`; prefer Confirmed / Invited / Tentative / Unknown / N/A | **Critical** | **Dangerous** | High | M | Hardening | Open |
| HL-002 | H-AC / HC-COG | EA-1 H-AC-01 · HC-COG-005 | Label derived %/density/heat as presentation — never domain readiness | High | Hygiene | High | S | Hardening (+ Redesign copy) | Open |
| HL-003 | EA-4 / HC-COG | EA-4 · R-AC-07 · HC-COG-007 | Compact Unknown presentation (“awaiting data”) — do not fabricate | High | None | High | M | Redesign | Open |
| HL-004 | XR / HC-COG | EA-4 XR-01 · HC-COG-001 | Persistent “What Matters Now?” Executive Hero Layer | High | None | **Critical UX** | L | Redesign | Open |
| HL-005 | H-AC | EA-1 H-AC-04 | Calendar → Mission Workspace → Mutation → Return | Medium | Hygiene | Medium | M | Hardening / Redesign | Open |
| HL-006 | H-AC | EA-1 H-AC-03 | Shared Week/Month calendar assembly helper | Medium | Hygiene | Low | M | **Foundation** | Open |
| HL-007 | H-AC | EA-1 H-AC-06 | Catalogue-bound disclosure in hero | Medium | Hygiene | Medium | S | Redesign (with XR-01) | Open |
| HL-008 | H-AC | EA-1 H-AC-05 | Deepen county/candidate links when IDs exist | Low | Hygiene | Medium | S | Hardening | Open |
| HL-009 | EA-4 | EA-4 | Visual hierarchy / legend / campaign identity | Medium | None | High | L | Redesign | Open |
| HL-010 | HC-COG | EA-2 HC-COG-002 | Unequal panel weights — one decision hierarchy per view | High | None | High | M | Redesign | Open |
| HL-011 | HC-COG | EA-2 HC-COG-003 | Put next action / primary decision in orientation zone | High | None | High | M | Redesign | Open |
| HL-012 | HC-COG | EA-2 HC-COG-006 | Surface “What changed?” in first 10s (Week especially) | Medium | None | High | S | Redesign | Open |
| HL-013 | HC-COG | EA-2 HC-COG-004 | Hide or clearly defer Agenda/Timeline/Mission chips until ready | Medium | None | Medium | S | Foundation / V2 | Open |
| HL-014 | HC-COG | EA-2 HC-COG-008 | Demote standing reminders / weather from primary scan path | Low | None | Low | S | Redesign | Open |
| HL-015 | HC-COG | EA-2 Week 5.8 | Week View decision remediation first among calendar views | High | None | High | L | Redesign | Open |

---

## Severity guidance

| Severity | Use when |
|----------|----------|
| Critical | False certainty / Trust Model break / security / data loss |
| High | Operator cannot decide; confuses presentation with domain truth; primary cognition failure |
| Medium | Drift, duplicated logic, shallow navigation, polish that blocks confidence |
| Low | Nice-to-have consistency |

## Target fitness

```text
EA-1 Architecture ........... 7.9
EA-2 Decision portfolio ..... 6.4
Hardening exit (arch) ....... 8.8+
V2 maintain (arch) .......... ≥ 9.0
Decision portfolio target ... ≥ 8.0 after Redesign XR-01 stack
```

## Intake rule

When an audit stream closes, add rows here within the same pass. Do **not** leave remediation only inside the stream report.

## Execution waves (Product Health)

| Wave | Name | Ledger focus |
|------|------|----------------|
| **1** | Architectural Safety | HL-001, HL-002, HL-005 |
| **2** | Decision Clarity | HL-004, HL-010, HL-011, HL-015 (+ HC-COG orientation) |
| **3** | Shared Infrastructure | HL-006 · legend / rendering / filters / nav |
| **4** | Experience Quality | HL-003, HL-009, HL-012, HL-014 · motion · brand · density |
| **5** | Foundation Readiness | Agenda / Timeline / Mission — **after** Waves 1–4 |

Hardening implements Wave 1 (and hygiene from Wave 2 labels) first; XR-01+ Wave 2 bulk runs in Redesign after Hardening gate — still planned here so priority is not lost.

## Streams not yet ingested

EA-3 · EA-5 · EA-6 · EA-7 · EA-8 · EA-9 · EA-10 · EA-11 · EA-12 — append on completion.  
**Product Health:** COMPLETE — EA-3+ unblocked.

## Hardening gate

Hardening implementation remains **BLOCKED** until Engineering Audit exit (or Steve waiver). Ledger may grow while audits run.
