# KCCC — Operator Observation Cadence (standing)

```text
Status: PERMANENT PRACTICE
Applies after: every major build milestone
First instance: Operator Usability Pass 1 (blocks Step 12)
Milestone: Calendar Foundation v1 CLOSED for build — observation OPEN
```

## Why this exists

We stop building at milestones not because we lack ideas, but because the product is finally usable enough to **teach us**.

If we keep building, we decide from what we *think* operators need.  
If we pause and observe, we decide from how they *actually* work.

Operators reveal architecture problems before developers do. Continuous building without observation produces software adapted from generic scheduling assumptions. Observation keeps the Campaign Operating System grounded in how campaigns actually run.

---

## Standing cycle

```text
Build
  ↓
Internal validation
  ↓
Operator observation
  ↓
Synthesis
  ↓
Refinement
  ↓
Next phase
```

Do **not** return to “build continuously” across major milestones.

Not every pass must be as extensive as Pass 1. Keep operators in the loop at each major step; scale depth to risk.

---

## Evidence pipeline (preserve)

More valuable than traditional bug tracking:

```text
Operator Context
  ↓
Observation
  ↓
Evidence
  ↓
Interpretation
  ↓
Synthesis
  ↓
Architecture decision
```

| Weak signal | Strong signal |
|-------------|---------------|
| “Search should be bigger.” | “All three operators searched before browsing.” |

The second tells us *why*. Evidence changes **architecture**, not just UI chrome.

### Review format (bring evidence, not a bug list)

```text
Universal Pattern #1

Kelly:
Searched before browsing.

Steve:
Searched before browsing.

Staff:
Searched before browsing.

Evidence:
All three users expected search to be the primary navigation.

Interpretation:
Search may deserve a first-class position in the header.
```

---

## Success questions (every major pass)

Observation should leave answers to:

* What screen do users naturally gravitate to first?
* Which information do they look for before taking action?
* Which fields do they consistently ignore?
* Which actions feel obvious?
* Which actions require thought?
* Where do they expect relationships, preparation, or travel information to appear?

These patterns shape not only the next step, but Steps through the rest of the roadmap.

---

## Qualitative trend scorecard (across phases)

Track enough consistency to see whether each phase makes the system more intuitive. Exact timing precision is not required.

| Measure | Target |
|---------|:------:|
| Confusion moments per session | Decreasing |
| Requests for help | Decreasing |
| Navigation backtracks | Decreasing |
| Confidence at session end | Increasing |
| Time until the “magic moment” | Decreasing |

Record per pass in that pass’s synthesis (Pass 1: `KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md`).

---

## Protocol artifacts

| Artifact | Role |
|----------|------|
| `KCCC_OPERATOR_USABILITY_PASS_1.md` | First full research protocol (locked — run it) |
| `KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md` | Post-session synthesis before Step 12 |
| This file | Standing cadence for all future phases |

Later passes may be lighter copies of the same pipeline (Context → Observe → Evidence/Interpretation → Synthesis → Decision).

---

## Planned observation gates (indicative)

| After milestone | Observation focus |
|-----------------|-------------------|
| Step 11 Event Operations | **Pass 1 — in progress** (blocks Step 12) |
| Step 12 Availability Rules | How standing rules feel in real scheduling |
| Step 13 Conflict Engine | Conflict signals vs false alarms / noise — **architecture ready; implement only after Step 12** |
| Step 14 Mission Integration | Mission vs Event mental model |
| Step 15 Relationship Integration | People/orgs in daily schedule work |

---

## Product framing (preserve)

This is not “building a calendar.”

It is a **Campaign Operating System** with the calendar as its operational center.

Future work stays focused on helping people **run campaigns**, not merely manage appointments.

---

## Calendar Foundation v1

```text
✅ Steps 8–11 shipped (security → Event → views → create/edit)
⏸ Operator Observation Pass 1
⏸ Synthesis
⏸ Step 12 authorization

Architecture stable enough for real operators:
  One canonical Event · One Event graph · One repository · One service layer
  Multiple operating views · Progressive editing · Mission as projection
  Communications frozen
```

Next improvements should come from Kelly, staff, and real campaign work through the system—not from more assumption-driven code.

When Pass 1 + synthesis are complete, use evidence to decide whether Step 12 needs small refinements to the existing experience or should reshape how availability and scheduling intelligence are presented.

---

## Current hold

```text
Campaign OS Baseline: 1.0 FROZEN
Engineering: PAUSED — ready for operator observation
Gate: Operator Observation Pass 1 + Synthesis 1
Step 12: NOT AUTHORIZED until evidence reviewed with Steve
Further doctrine: NOT AUTHORIZED
Do not change Pass 1 protocol further — run it
```
