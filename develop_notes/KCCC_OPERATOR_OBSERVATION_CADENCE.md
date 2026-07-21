# KCCC — Operator Observation Cadence (standing)

```text
Status: PERMANENT PRACTICE
Applies after: every major build milestone
First instance: Operator Usability Pass 1 (blocks Step 12)
```

## Why this exists

We stop building at milestones not because we lack ideas, but because the product is finally usable enough to **teach us**.

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
| “User couldn’t find button.” | “All three operators searched before browsing.” |

Evidence changes **architecture**, not just UI chrome.

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
| Step 13 Conflict Engine | Conflict signals vs false alarms / noise |
| Step 14 Mission Integration | Mission vs Event mental model |
| Step 15 Relationship Integration | People/orgs in daily schedule work |

---

## Product framing (preserve)

This is not “building a calendar.”

It is a **Campaign Operating System** with the calendar as its operational center.

Future work stays focused on helping people **run campaigns**, not merely manage appointments.

---

## Current hold

```text
Engineering: PAUSED at Operator Observation Pass 1
Step 12: NOT AUTHORIZED until synthesis reviewed with Steve
Next highest-leverage work: run sessions → accumulate evidence → shape Step 12
```
