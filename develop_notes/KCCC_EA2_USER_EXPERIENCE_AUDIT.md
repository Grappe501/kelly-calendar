# EA-2 Decision-Making Audit — Operator Experience

**Script ID:** `KCCC-EA-2-USER-EXPERIENCE`  
**Parent:** `KCCC_ENGINEERING_AUDIT.md`  
**Status:** COMPLETE  
**Assessment:** **PASS WITH FINDINGS**  
**Nature:** **Decision-making audit** — not a usability checklist  
**Complements:** EA-4 (visual) · EA-1 (architecture)  
**Evidence:** Day/Week/Month views + services (code walkthrough 2026-07-19)  
**Implementation:** Audit only — no feature adds · no Redesign coding  

```text
EA-4 asks: How does it look and feel?
EA-1 asks: Who owns the truth?
EA-2 asks: Does the platform help the operator decide?
```

---

## Executive objective

> Verify that the platform helps an operator make **correct decisions quickly, confidently, and with minimal cognitive effort**.

This is different from asking whether the UI is “easy to use.”

---

## Four layers

| Layer | Focus |
|-------|--------|
| **L1 Orientation** | First 10 seconds — Where am I? What matters? What changed? Attention? Next? |
| **L2 Cognitive Load** | Scanning distance, choices, repetition, hidden actions, context switching, depth |
| **L3 Executive Confidence** | After one minute: more confident or more uncertain? |
| **L4 Decision Support** | One primary decision per page — if none, reconsider existence |

### Primary decisions (Architecture-aligned)

| View | Primary decision |
|------|------------------|
| Day | What do I need to accomplish today? |
| Week | How should I coordinate this week? |
| Month | Are we on track strategically? |

Executive questions already present in services (good seed — hierarchy still weak):

| View | Current `executiveQuestion` |
|------|----------------------------|
| Day | “What am I doing today?” |
| Week | “What does the campaign need to accomplish this week?” |
| Month | “What are the major campaign commitments and strategic milestones over the next 30–60 days?” |

---

## Twelve questions (answered)

| # | Question | Answer |
|---|----------|--------|
| Q1 | Priorities within 10 seconds? | **No** — no persistent “What Matters Now?”; readiness/schedule compete equally |
| Q2 | Navigation predictable Day/Week/Month? | **Yes** — shared switcher + date nav; day↔week↔month links work |
| Q3 | Controls never used? | Disabled Agenda/Timeline/Mission chips (visible, inert); Weather panel (placeholder); Standing reminders often skimmed |
| Q4 | Where do users hesitate? | Disabled “· next” chips; six Unknown domain tiles; when next action is only a Brief hop |
| Q5 | Unclear labels? | “Schedule readiness” + `% ready of loaded missions`; “Mission readiness strip” that is all Unknown; density/heat without “presentation” label |
| Q6 | Repeatedly searched for? | “What changed?” (Week brief is late); county/entity detail (hubs only); true next action among equal panels |
| Q7 | Confidence or uncertainty? | **Mixed → uncertainty-leaning** — Trust doctrine honest, but Unknown wall + equal panels + misleading % |
| Q8 | Ignored as unimportant? | Standing reminders; Weather; muted ownership footnotes (ironically critical); engineering Track A chrome |
| Q9 | Visual attention competitors? | Every `panel` same weight; domain strip vs week header vs grid vs rails |
| Q10 | Decisions requiring leave-page? | Brief/Command; County/Volunteer/Candidate hubs; domain tiles; mission deep work (desired for ownership) |
| Q11 | Should be proactive (not nav)? | What Matters Now; What changed; Top blocked/attention; Next action; catalogue-partial warning in hero |
| Q12 | Single most important thing each page communicates? | See scorecards — currently **split** across panels; should be the primary decision |

---

## Layer probes (Orientation — first 10s)

| Probe | Day | Week | Month |
|-------|-----|------|-------|
| Where am I? | Pass (Calendar · Day · date) | Pass (week range + campaign week) | Pass (month label) |
| What matters now? | **Fail** | **Fail** | **Fail** |
| What changed? | Fail / weak | Partial (brief late) | Weak |
| What needs attention? | Partial (Readiness early) | Partial (counts; Unknown strip dominates) | Weak (density ≠ attention) |
| What should I do next? | Partial (`nextAction` if present) | Weak | Weak (open day/week) |

**Rule:** If any probe requires searching the interface, orientation fails. → All three views fail L1 on “matters now.”

---

# Page scorecards

## Day View

**Primary decision:** What do I need to accomplish today?  
**Most important thing it should communicate:** Today’s priority + next action.

```text
Orientation ............ 5/10
Decision Support ....... 7/10
Confidence ............. 6/10
Navigation ............. 8/10
Cognitive Load ......... 5/10
Trust Clarity .......... 9/10
Overall Experience ..... 6.7/10
```

| Strength | Gap |
|----------|-----|
| Executive question present; Readiness early; schedule + missions support today’s work; Trust notes strong | No hero; equal panels; Brief is leave-page; conflicts/reminders/weather dilute |

## Week View

**Primary decision:** How should I coordinate this week?  
**Most important thing it should communicate:** Coordination priorities + what changed + risks.

```text
Orientation ............ 4/10
Decision Support ....... 6/10
Confidence ............. 5/10
Navigation ............. 8/10
Cognitive Load ......... 4/10
Trust Clarity .......... 8/10
Overall Experience ..... 5.8/10
```

| Strength | Gap |
|----------|-----|
| Week grid + mission rail + “What changed?” block exist; ownership footnotes | Unknown domain wall; `% ready` false confidence; many equal panels; brief/decision content below fold |

## Month View

**Primary decision:** Are we on track strategically?  
**Most important thing it should communicate:** Strategic track + major commitments.

```text
Orientation ............ 5/10
Decision Support ....... 7/10
Confidence ............. 6/10
Navigation ............. 9/10
Cognitive Load ......... 5/10
Trust Clarity .......... 8/10
Overall Experience ..... 6.7/10
```

| Strength | Gap |
|----------|-----|
| Phase/election/focus/highlights; excellent day/week drill-down | No strategic “on track?” verdict surface; density ≠ priority; heat competes with decision |

## Portfolio

```text
Day .................... 6.7
Week ................... 5.8
Month .................. 6.7
EA-2 Portfolio ......... 6.4/10
```

Week is the weakest decision surface — highest cognitive load + lowest confidence.

---

# HC-COG findings (cognition tag)

Distinct from architecture (H-AC) and visual (EA-4 / XR).

| ID | Finding | Severity | Target |
|----|---------|----------|--------|
| HC-COG-001 | Priority / “What Matters Now?” not obvious in first 10s | High | Redesign XR-01 |
| HC-COG-002 | Too many equal-weight panels | High | Redesign |
| HC-COG-003 | Primary decision / next action below fold or leave-page only | High | Redesign + Hardening copy |
| HC-COG-004 | Disabled Agenda/Timeline/Mission chips cause hesitation | Medium | Foundation / V2 (or hide until ready) |
| HC-COG-005 | Action / metric lacks decision context (`% ready`, density) | High | Hardening (→ HL-002) |
| HC-COG-006 | “What changed?” not in orientation zone | Medium | Redesign |
| HC-COG-007 | Unknown strip increases uncertainty load (doctrine-correct) | High | Redesign compact Unknown |
| HC-COG-008 | Standing reminders / weather ignored — noise in scan path | Low | Redesign demote |

---

# Confidence model (L3)

Confidence comes from: clear priorities · trustworthy data · obvious next actions · visible ownership · understandable uncertainty — **not** more information.

| View | After 1 minute | Driver |
|------|----------------|--------|
| Day | Slightly more confident if missions load; else flat | Readiness + cards help; no hero |
| Week | **More uncertain** | Unknown wall + `% ready` + panel flood |
| Month | Neutral → slight confidence | Phase/focus help; priority still diffuse |

---

# Success criteria

| Criterion | Met? |
|-----------|------|
| Every page answers one executive question | **Partial** — question string present; hierarchy doesn’t answer it |
| Every page supports one primary decision | **Yes** (intent) · **weak delivery** |
| Priorities obvious within 10 seconds | **No** |
| Users know next action without searching | **Partial** (Day only when `nextAction` set) |
| Hierarchy reduces cognitive effort | **No** — equal panels |
| Trust and uncertainty communicated clearly | **Yes** (doctrine) · presentation overwhelms |
| Operator confidence increases after using the page | **Not consistently** — Week fails |

**Close EA-2:** PASS WITH FINDINGS — decision architecture intent is present; decision delivery is not yet product-grade.

---

# Interim gate (binding)

```text
EA-1 Architecture .............. COMPLETE
EA-2 Decision-Making ........... COMPLETE
EA-4 Visual & Experience ....... COMPLETE
                ↓
Version 1 Product Health Report  ← NEXT (synthesize before EA-3)
                ↓
Remaining audits (EA-3, EA-5…)
                ↓
Hardening (Master Ledger)
```

Do **not** jump to EA-3 until Product Health synthesis closes.

---

## Architecture 1.0 Conformance Statement

EA-2 does not amend Architecture 1.0. Fixes that would invent domain truth to “boost confidence” are **forbidden**. Raise confidence by hierarchy, labeling, and navigation — not by fabricating readiness.
