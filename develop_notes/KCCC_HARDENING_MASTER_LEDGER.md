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
| HL-016 | PQ | EA-3 RC-01 | Extract shared calendar assembly / mission-context batch (kill Week/Month dupe) | Medium | Hygiene | Low | M | Foundation / Wave 3 | Open |
| HL-017 | PQ | EA-3 PQ-7 | Smoke/unit tests for view assembly + `view`/`date` navigation | Medium | None | Medium | M | Hardening | Open |
| HL-018 | PQ | EA-3 PQ-2 | Token inventory + Redesign gap list (status, density, motion) — no page rewrite | Medium | None | Medium | S | Hardening → Redesign | Open |
| HL-019 | PQ | EA-3 PQ-6 | Document perf hotspots (catalogue cap, month DOM); measure only | Low | None | Low | S | Hardening | Open |
| HL-020 | PQ | EA-3 PQ-5/8 | Foundation API sketch (event cell, legend, filters) — docs only | Medium | None | Medium | M | Foundation prep | Open |
| HL-021 | INCL | EA-5 IE-001 | Non-color month density cue (count/pattern/aria) | High | None | High | S | Hardening | Open |
| HL-022 | INCL | EA-5 IE-002 | Deferred Agenda/Timeline/Mission chip AT labels (or hide) | Medium | None | Medium | S | Hardening | Open |
| HL-023 | INCL | EA-5 IE-003 | Date nav landmark + Previous/Next target labels | Medium | None | Medium | S | Hardening | Open |
| HL-024 | INCL | EA-5 IE-004 | Optional skip-to-schedule within calendar page | Low | None | Medium | S | Hardening | Open |
| HL-025 | PERF | EA-6 PERF-001 | Batch/cached ACL for event list (preserve projections) | High | Hygiene | High | M | Hardening | Open |
| HL-026 | PERF | EA-6 PERF-002 | Date-range event list API for calendar adapters | High | Hygiene | High | M | Hardening / Foundation | Open |
| HL-027 | PERF | EA-6 PERF-004 | Timed assemble smoke (≤50 synthetic events) — measure first | Medium | None | Low | S | Hardening | Open |
| HL-028 | DI | EA-7 DI-002 | Label candidate-kind schedule as heuristic / non-authoritative | High | Hygiene | Medium | S | Hardening | Open |
| HL-029 | DI | EA-7 DI-003 | Relabel month brief echoes as schedule-derived (Brief link remains owner) | High | Hygiene | Medium | S | Hardening | Open |
| HL-030 | DI | EA-7 DI-004 | Day View cataloguePartial disclosure parity | Medium | Hygiene | Medium | S | Hardening | Open |
| HL-031 | SEC | EA-8 SEC-002 | Permission-aware mission context — do not enrich limited projections | **Critical** | **Dangerous** | High | L | Hardening (guard) / **Foundation** (contract) | Open |
| HL-032 | SEC | EA-8 SEC-001 | Map AVAILABILITY_ONLY to busy/time-only (not TITLE_LOCATION) | High | Hygiene | High | M | Hardening | Open |
| HL-033 | SEC | EA-8 SEC-003 | Minimize primary-calendar metadata for related-only grants | High | Hygiene | Medium | M | Hardening | Open |
| HL-034 | SEC | EA-8 SEC-004 | Align capability / mission-day affordances with authorize() | Medium | Hygiene | Medium | S | Hardening | Open |
| HL-035 | SEC | EA-8 SEC-005 | Scope CONFLICT_ACKNOWLEDGE to authorized event/calendar | High | Dangerous | High | M | Foundation | Open |
| HL-036 | SEC | EA-8 SEC-006 | Actor + RBAC on /api/calendars and system diagnostic APIs | High | Hygiene | High | M | Hardening | Open |
| HL-037 | SEC | EA-8 SEC-007 | Unify production session-secret policy (edge + Node + status) | High | Hygiene | Medium | M | Foundation | Open |
| HL-038 | SEC | EA-8 SEC-008 | Explicit per-product env isolation (opt-in RedDirt fallback) | High | Hygiene | Medium | M | Foundation | Open |
| HL-039 | OW | EA-9 OW-001 | Consume mission deep-link / Mission Workspace entry (`?event=` currently ignored) | **Critical** | Hygiene | **Critical** | L | **Foundation** (reinforces HL-005) | Open |
| HL-040 | OW | EA-9 OW-002 | Week mission-level progression into authorized context | High | None | High | M | Foundation | Open |
| HL-041 | OW | EA-9 OW-003 | Month highlight/deadline → Day/Week or owning module | High | None | High | M | Foundation | Open |
| HL-042 | OW | EA-9 OW-004 | Preserve or declare planning period on domain hops | High | None | High | M | Foundation | Open |
| HL-043 | OW | EA-9 OW-006 | Explicit reason when day actions absent (permission / date / capability) | Medium | Hygiene | Medium | S | Hardening | Open |
| HL-044 | OW | EA-9 OW-007 | Empty Day recovery path parity with Brief | Medium | None | Medium | S | Hardening | Open |
| HL-045 | OW | EA-9 OW-008 | Period-aware Unknown recovery for domain tiles | High | None | High | M | Foundation | Open |

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
EA-3 ESI baseline ........... 5.7
Hardening exit (arch) ....... 8.8+
Hardening exit (ESI) ........ 7.5+
Foundation exit (ESI) ....... 8.5+
V2 maintain (arch / ESI) .... ≥ 9.0 / ≥ 8.5
Decision portfolio target ... ≥ 8.0 after Redesign XR-01 stack
```

## Intake rule

When an audit stream closes, add rows here within the same pass. Do **not** leave remediation only inside the stream report.

## Execution waves (revised — EA-3 executive)

```text
Wave 1 — Architectural Safety
Wave 2 — Testability & Verification
Wave 3 — Decision Clarity
Wave 4 — Shared Infrastructure
Wave 5 — Experience Quality
Wave 6 — Foundation Readiness
```

| Wave | Name | Ledger focus |
|------|------|----------------|
| **1** | Architectural Safety | HL-001, HL-002, HL-005, **HL-031** |
| **2** | Testability & Verification | HL-017 · assembly/nav tests · protect state model |
| **3** | Decision Clarity | HL-004, HL-010, HL-011, HL-015 (+ HC-COG) — mostly Redesign; label hygiene in Hardening |
| **4** | Shared Infrastructure | HL-006, HL-016 · legend / rendering / filters / nav |
| **5** | Experience Quality | HL-003, HL-009, HL-012, HL-014 · motion · brand · density |
| **6** | Foundation Readiness | HL-020 · **HL-039** mission entry · Agenda / Timeline / Mission — **after** Waves 1–5 |

Wave 2 is **before** Decision Clarity so Redesign/Foundation changes are verifiable. XR-01 bulk still runs in Redesign after Hardening gate; Wave 3 keeps priority visible.

## Streams not yet ingested

EA-10 · EA-11 · EA-12 — append on completion.  
EA-3 Platform Quality: **COMPLETE / ACCEPTED** (HL-016…HL-020).  
EA-5 Inclusive Experience: **COMPLETE / ACCEPTED** (HL-021…HL-024).  
EA-6 Performance: **COMPLETE / ACCEPTED** (HL-025…HL-027).  
EA-7 Data Integrity: **COMPLETE / ACCEPTED** (HL-028…HL-030; DI-001 → HL-001).  
EA-8 Security: **COMPLETE / ACCEPTED** (HL-031…HL-038; SEC-002 → HL-031 Wave 1).  
EA-9 Operator Workflow: **COMPLETE** (HL-039…HL-045; OW-005 → HL-030 confirmed).  

Operator note (2026-07-19): live week Events ingested without new UI — **HL-039 drill-down** and **XR-8 AI** remain deferred (Feature Freeze). See `KCCC_OPERATOR_WEEK_INGEST_2026-07-19.md`.

## Hardening gate

Hardening implementation remains **BLOCKED** until:

1. EA-5…EA-12 complete, **and**  
2. **Program Readiness Review** COMPLETE (`KCCC_PROGRAM_READINESS_REVIEW.md`),  

or Steve records a waiver. Ledger may grow while audits run.
