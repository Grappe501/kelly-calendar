# EA-1 Architecture Compliance Audit — Constitutional Report

**Script ID:** `KCCC-EA-1-ARCHITECTURE-COMPLIANCE`  
**Parent:** `KCCC_ENGINEERING_AUDIT.md`  
**Status:** COMPLETE  
**Assessment:** **PASS WITH FINDINGS**  
**Nature:** Governance review of Calendar Experience V1 — **not** a code-quality review  
**Baseline:** Architecture 1.0 (`6690ce2`) · Trust Model (Pass with Conditions)  
**Evidence:** `calendar-day/week/month-view-service.ts`, calendar components, mission card embedding (2026-07-19)  
**Also covers:** broadened implicit ownership check (consume vs own · derived traceability · no UI-as-business-state · no implicit owner of operational truth)

```text
Mission:
Verify every Calendar Experience V1 engineering decision
still conforms to Architecture 1.0.
```

---

## Executive verdict

Architecture 1.0 **remains intact**. The calendar does **not** own operational truth as a system of record.

Findings are **presentation / boundary hygiene** issues — not ownership model failure. Safe to continue remaining audits → Hardening → Experience Redesign, with listed corrections in Hardening (and UX treatment of Unknown/% in Redesign).

| Layer | Result |
|-------|--------|
| Ownership model | Intact |
| Consumption model | Intact with noted derives |
| Unknown doctrine | Intact with presentation risks |
| Implicit ownership | **Not established** as SoR; minor UI hosting of mutations |
| Architecture 1.0 | Fully intact |

---

# Architecture Findings (AC-1 … AC-10)

## AC-1 Ownership Integrity

**Question:** Who owns this information? Answer must point **outside** the calendar.

| Information | Canonical owner (expected) | Calendar role | Result |
|-------------|---------------------------|---------------|--------|
| Schedule / events | Phase 1 Calendar / Mission schedule (via `listEventsForActor` → safe projections) | Consumes / Displays | Pass |
| Mission cards | Phase 1 mission context + event projection | Consumes / Displays | Pass |
| Travel snaps | Logistics / travel plans on events | Consumes / aggregates (derive) | Pass |
| Volunteer staffing signals | Geo / Volunteer domain | Consumes / Displays / Links `/volunteers` | Pass |
| County geo | County domain | Consumes / Links `/counties` | Pass |
| Executive / Brief | Brief / Command modules | Links `/brief`, `/command` | Pass |
| Domain readiness (Exec/Field/…) | Domain modules | **Does not invent** — Week strip = UNKNOWN + link | Pass |
| Weather | Future external (Advisory) | `NOT_INTEGRATED` | Pass |

**Drift check:** No finding that “the calendar owns” schedule, missions, travel, volunteer, county, or readiness as SoR. Services explicitly document “owns no facts.”

**Score contribution:** Ownership Integrity **9/10** (see AC-4 mutation hosting).

---

## AC-2 Consumption vs Ownership

Widget classification (Calendar V1):

| Widget / signal | Class | Notes |
|-----------------|-------|-------|
| Event list / day cells | Consumes · Displays | Safe projections |
| MissionCardView | Consumes · Displays · **(hosts mutate UI)** | See AC-4 |
| Domain strip | Displays Unknown · Links | Correct non-ownership |
| Travel totals / miles | Derives · Displays | From loaded snaps; partial flags |
| County heat / density | Derives · Displays | Presentation density |
| Campaign week index | Derives · Displays | Documented display-only |
| Mission rail priorities | Derives · Displays | Sort of mission cards |
| Title classifiers (candidate/highlight) | Derives · Displays | Heuristic labels |
| Conflict overlap list | Derives · Displays | OI detector; advisory |
| Brief / Command buttons | Links | Pass |
| Date/view query params | Presentation / Session state | Pass |

**Rule check:** Overwhelmingly Displays / Consumes / Links. Derives exist (expected for assembly). **Nothing persists as a new SoR.**

**Score:** Consumption Model **8/10**

---

## AC-3 Derived Truth Audit

| Derived value | Reproducible from canonical? | Labeled derived? | Stale risk | Provenance need | Finding |
|---------------|------------------------------|------------------|------------|-----------------|---------|
| Event counts (day/week/month) | Yes, from loaded set | Implicit | **Yes** — `take: 50` truncates; `cataloguePartial` disclosed | Disclose load bound | Pass w/ note |
| Travel minutes / miles / overnight | Yes, from logistics/travel snaps | Partial flags present | Yes if snaps stale | Keep partial language | Pass |
| Campaign week index | Yes, from floor date math | Footnote “display-only” | N/A (pure display) | Keep label | Pass |
| Month density / county heat | Yes, from event counts / geo | Weak (visual only) | Same as catalogue | Label “presentation density” | Finding |
| Mission rail “Priority N” | Yes, sort of risk/time | Weak | N/A | Label “sorted from loaded missions” | Finding |
| Week `readyPct` UI (`% ready of loaded missions`) | From mission readiness states | **Weak — looks authoritative** | Yes | **Must not read as domain readiness %** | **High finding** |
| `campaignPhase` string | From election countdown thresholds | Weak | N/A | Label display heuristic | Finding |
| Title → highlight/candidate kind | Heuristic on title | Implicit | N/A | Non-authoritative label | Finding |
| Conflicts with `candidateAttending: true` forced | Overlap math yes; attending assumption **not** from owner | No | N/A | Don’t assume attending | **Finding** |

**Score:** Traceability **7/10**

---

## AC-4 Navigation Integrity

| From | Terminates at | Authoritative? | Finding |
|------|---------------|----------------|---------|
| Month day number | Day View | Calendar presentation | Pass (view zoom) |
| Month “W” | Week View | Calendar presentation | Pass |
| County heat / county list | `/counties` hub | County ops hub — **not county detail** | Finding: shallow |
| Candidate schedule items | `/candidate` hub | Candidate hub | Finding: shallow |
| Volunteer summary | `/volunteers` | Volunteer ops | Pass |
| Domain strip | Domain home routes | Domain homes | Pass |
| Brief / Command | `/brief`, `/command` | Owners | Pass |
| Mission card primary action | `immediateAction.href` | Varies by card | Pass if href owns |
| **MissionDayActions on Day View** | Mutates via mission-day API | **Owner API** but **edit UI hosted in calendar** | **Finding** |

**Rule:** Never duplicate editing capabilities inside the calendar.  
**Finding AC-4-1 (Medium):** Day View embeds `MissionDayActions` (confirm/arrive etc.) when `canMutateDayActions` — mutations hit owning APIs (good) but calendar hosts management UI (boundary blur). Prefer link-to-owner or clearly scoped “quick action delegates to owner.”

**Score:** Navigation Integrity **7/10**

---

## AC-5 State Ownership

| State | Class | Result |
|-------|-------|--------|
| `?view=` / `?date=` | Presentation / Session | Pass |
| Selected week/month anchors | Presentation | Pass |
| Mission day action POSTs | Business mutation via owner API | Pass path; UI placement finding (AC-4) |
| No localStorage/business cache in calendar views | — | Pass |
| Conflict list / heat / density | Ephemeral derive per request | Pass |

**No evidence** that UI state has become durable business/canonical state.

**Score:** State Ownership **9/10**

---

## AC-6 Traceability

Operators can verify many values via footnotes and module links. Gaps:

- `% ready` lacks “derived from loaded missions — not domain readiness”  
- Heat/density lack “presentation only” chip  
- County/candidate rows don’t deep-link to entity IDs  

**Score:** Traceability (operator) folded into AC-3 → **7/10**

---

## AC-7 Unknown Doctrine

Verified paths:

| Path | Status |
|------|--------|
| Fabricated domain readiness | **Absent** — Week strip UNKNOWN | Pass |
| Weather invented | **Absent** — `NOT_INTEGRATED` | Pass |
| Missing miles → 0 as fact | **Absent** — null + partial | Pass |
| Empty day → “no activity proven” | Mitigated by `cataloguePartial` warning | Pass |
| Unknown → Estimated → Fact | **No path found** | Pass |
| Soft risk: `% ready` may feel like fact | Presentation risk | Finding → Redesign/Hardening label |

**Score:** Unknown Doctrine **8/10**

---

## AC-8 Cross-Domain Boundaries

Calendar **orchestrates navigation** and assembles read models. It does not absorb County/Volunteer/Brief ownership.

Boundary pressures:

1. Mission day actions on calendar (AC-4-1)  
2. Heuristic “candidate-facing” classification inside calendar adapter (should remain non-authoritative)  
3. Conflict detector assumes `candidateAttending: true` for all blocks  

**Score:** Domain Boundaries **8/10**

---

## AC-9 Engineering Drift

| Drift type | Evidence | Severity |
|------------|----------|----------|
| Duplicated adapter logic | `loadMissionContextBatched` + mission card build copied Week/Month | Medium — Hardening: shared calendar assembly helper |
| Duplicated ownership | **Not found** as SoR | — |
| Duplicated editing | MissionDayActions on Day View | Medium |
| Duplicated workflows | Not found (no parallel create-event SoR) | — |
| Duplicated business rules | Title classifiers + highlightKind local to calendar | Low — keep non-authoritative |
| Catalogue cap | `listEventsForActor` `take: 50` | Medium — disclose already; Hardening may raise range query later **without** calendar owning |

**Score:** Architectural Drift **7/10**

---

## AC-10 Architecture Fitness Score

| Category | Score |
|----------|------:|
| Ownership Integrity | 9/10 |
| Consumption Model | 8/10 |
| Traceability | 7/10 |
| Navigation Integrity | 7/10 |
| Unknown Doctrine | 8/10 |
| State Ownership | 9/10 |
| Domain Boundaries | 8/10 |
| Architectural Drift | 7/10 |
| **Overall Fitness** | **7.9/10** |

**Baseline for V2+ comparison.** Target after Hardening: ≥ 8.5/10 without changing Architecture 1.0.

---

# Required Corrections (Hardening / Redesign — not ownership RFC)

| ID | Correction | Track | Priority |
|----|------------|-------|----------|
| H-AC-01 | Label all %-style and density/heat metrics as **derived / presentation** (never domain readiness) | Hardening + Redesign copy | P0 |
| H-AC-02 | Stop forcing `candidateAttending: true` without owner signal; default Unknown/omit or consume true attending flag | Hardening | P0 |
| H-AC-03 | Extract shared calendar assembly helper (batched context + mission cards) to kill Week/Month duplication | Hardening | P1 |
| H-AC-04 | Day View: demote or gate MissionDayActions — prefer navigate-to-owner; if quick actions remain, document as **delegated mutations** | Hardening / Redesign | P1 |
| H-AC-05 | Deepen county/candidate links when IDs exist; else keep hub + “open owner” | Hardening | P2 |
| H-AC-06 | Persist catalogue-bound disclosure in hero (pairs with XR-01) | Redesign | P1 |
| R-AC-07 | Unknown wall UX (EA-4) — compact “awaiting data” — **presentation only** | Redesign XR-01 / hierarchy | P0 |

**No RFC required** — none of these change Architecture 1.0 ownership.

---

# Protected Patterns (preserve)

1. **Adapter services declare “owns no facts”** and consume `listEventsForActor` + `loadMissionContextForIds`.  
2. **Safe projections** as the schedule atom.  
3. **Domain readiness Unknown + link-out** rather than inventing week-scoped domain truth.  
4. **Partial flags** on travel aggregates (`knownMilesPartial`, etc.).  
5. **`cataloguePartial` honesty** when loader caps.  
6. **`weatherStatus: NOT_INTEGRATED`** — no fake weather.  
7. **Display-only campaign week index** with explicit footnote.  
8. **Drill-down zoom** Day ↔ Week ↔ Month via `view`/`date` without new SoR.  
9. **Links to `/brief`, `/command`, domain homes** for authoritative work.  
10. **Trust Model alignment** — Unknown not coerced to false/0.

---

# Exit Criteria Checklist

| Criterion | Met? |
|-----------|------|
| Calendar owns no operational truth | **Yes** |
| Every displayed value has a canonical owner (or is labeled derived/display) | **Yes, with labeling gaps → H-AC-01** |
| Every derived value is reproducible | **Yes** (within load bound) |
| No UI state has become business state | **Yes** |
| Unknown doctrine remains intact | **Yes** |
| Drill-downs terminate at authoritative modules | **Mostly** — hubs OK; day actions → H-AC-04 |
| No architectural drift detected | **Minor drift only** → H-AC-02/03/04 |
| Architecture 1.0 remains fully intact | **Yes** |

**Close EA-1:** **PASS WITH FINDINGS** — proceed with remaining audit streams; feed Required Corrections into Hardening.

---

## Architecture 1.0 Conformance Statement

EA-1 confirms Calendar Experience V1 **did not amend** Architecture 1.0 ownership, Unknown doctrine, or Integration doctrine. Findings are hygiene and presentation-boundary issues only.  
**Affirms:** No amendments to Architecture 1.0 baseline (`6690ce2`).
