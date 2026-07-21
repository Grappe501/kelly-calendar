# KCCC — Operator Usability Pass 1

```text
Status: OPEN — observation in progress
Gate: Blocks Step 12 (Availability & Standing Rules)
Live: https://kelly-calendar.netlify.app
After: Step 11 Event Operations (d8bd594)
Doc: develop_notes/KCCC_OPERATOR_USABILITY_PASS_1.md
```

## Framing

This is **not testing**.

This is **observing**.

| Not the goal | The goal |
|--------------|----------|
| Can they finish the task? | What do they instinctively expect the software to do? |
| Does the feature function? | Does this feel like campaign work? |
| Did they find our design? | What words and paths do they reach for first? |

Operators reveal architecture problems before developers do. Developers work around awkward flows because they know how it was built. First-time users do not.

Record **hesitation** first. Bugs are secondary.

Stay disciplined: do not authorize Step 12 until this pass informs it. The pause may save weeks of rework.

---

## Success criteria

The pass succeeds when we can answer with confidence:

1. Can Kelly run her day from this application?
2. Can a staff member manage the schedule without training?
3. Does the interface encourage the correct workflow?
4. Are there obvious friction points that should be fixed before scheduling intelligence (Step 12)?

If any answer is “not yet,” fix (or consciously defer) before Availability Rules.

---

## Protocol

### A. Kelly session (30–60 min) — observe

Do **not** tell her where anything is.

Give **realistic requests**, then watch. If she hesitates, that is a design problem.

Suggested prompts (use as conversation, not a checklist to coach through):

- “Add tomorrow’s Rotary meeting.”
- “Move Friday’s fundraiser back an hour.”
- “Who are you meeting next Tuesday?”
- “Cancel next week’s county meeting.”
- “Show me everything in Pulaski County.”
- “What do you have to prepare today?”

| Time | Prompt / what she tried | Where she looked / clicked | Hesitation / expectation | Outcome |
|------|-------------------------|----------------------------|--------------------------|---------|
| | | | | |

---

### B. Steve session — edge cases, not bug hunting

You are the power user. Ask repeatedly:

> **Does this feel like campaign work?**

Not: “Does this feature technically function?”

Edge-case hunting:

- [ ] Move twenty events rapidly
- [ ] Duplicate recurring series
- [ ] Rename everything
- [ ] Search partial names
- [ ] Move events across midnight
- [ ] Cancel and restore repeatedly
- [ ] Edit while another browser window is open
- [ ] Create intentionally messy schedules
- [ ] Stress-test navigation speed
- [ ] Rapid reschedule / visibility churn / dense weeks (optional)

| Scenario | Feels like campaign work? (Y/N) | Awkwardness | Notes |
|----------|---------------------------------|-------------|-------|
| | | | |

---

### C. Staff session — most valuable

No interface explanation. Do not answer questions immediately.

Ask only something like:

> “Schedule tomorrow.”

When they stall, ask:

> “What are you looking for?”

Their wording tells us how the software should be organized.

Example: if they say “I’m trying to find tomorrow…,” maybe Today / Tomorrow / This Week deserves more prominence than traditional calendar chrome.

| First click / destination | What they said they were looking for | Questions held back | Notes |
|---------------------------|--------------------------------------|---------------------|-------|
| | | | |

---

## Things we expected users to do—but they didn’t

_Assumptions the product made that behavior disproved. Extremely valuable._

| Expected | Observed |
|----------|----------|
| User edits from Month view. | |
| People would use Agenda. | |
| Users start from Day / Week grid. | |
| | |

Examples of the form we want:

```text
Expected:
User edits from Month view.

Observed:
Every user clicked Today first.
```

```text
Expected:
People would use Agenda.

Observed:
Nobody opened Agenda.
```

---

## Repeated behaviors

_If all three sessions do the same thing—even if it is “wrong”—the software should probably adapt. Patterns beat individual opinions._

| Behavior | Kelly | Steve | Staff | Count | Implication |
|----------|-------|-------|-------|-------|-------------|
| Clicked event title expecting details | | | | /3 | |
| Searched before browsing | | | | /3 | |
| Went to Today immediately | | | | /3 | |
| Ignored Month | | | | /3 | |
| | | | | /3 | |

Freeform pattern notes:

1.
2.
3.

---

## Friction points

_Moments that slow the operator even when the system is “correct.”_

1.
2.
3.

---

## Unexpected workflows

_Paths people took that we did not design for (or that skip our intended flow)._

1.
2.
3.

---

## Missing shortcuts

_Actions that should be one click / one keystroke from Today or Day._

1.
2.
3.

---

## UI terminology

_Words that confuse (Publish vs Schedule, Archive vs Cancel, Mission vs Event, etc.)._

| Term shown | What people thought it meant | Suggested term |
|------------|------------------------------|----------------|
| | | |

---

## Confusing navigation

_Wrong module, wrong view, or “I can’t find it” moments._

1.
2.
3.

---

## Keyboard behavior

_Tab order, Enter to save, Esc, focus traps, unexpected browser defaults._

1.
2.
3.

---

## Mobile observations (if applicable)

_Phone / small viewport. Skip if not observed._

1.
2.
3.

---

## Suggested improvements

_Product refinements suggested by observation (not yet prioritized)._

1.
2.
3.

---

## Must-fix before Step 12

_Only items that would make Availability Rules dangerous or misleading if left alone._

| # | Issue | Why it blocks Step 12 | Owner |
|---|-------|----------------------|-------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## Nice-to-have later

_Can wait until after Availability / Conflict work._

| # | Idea | Notes |
|---|------|-------|
| 1 | | |
| 2 | | |
| 3 | | |

---

## Session log

| Date | Observer / participant | Role | Duration | Environment | Summary |
|------|------------------------|------|----------|-------------|---------|
| | Kelly | Candidate / principal | | Production | |
| | Steve | Power user / edge cases | | Production | |
| | | Campaign staff | | Production | |

---

## Decision gate

```text
Step 12 (Availability & Standing Rules) remains NOT AUTHORIZED
until this pass is filled, reviewed, and must-fix items are cleared
or explicitly deferred by Steve.
```

When ready to close:

- [ ] Kelly observation session complete
- [ ] Steve edge-case session complete
- [ ] Staff “Schedule tomorrow” session complete (or waived with reason)
- [ ] Expected-vs-observed section filled
- [ ] Repeated behaviors section filled
- [ ] Success criteria answered (Kelly day / staff without training / correct workflow / friction before Step 12)
- [ ] Must-fix list reviewed
- [ ] Steve authorizes Step 12: `KCCC-EA-12-AVAILABILITY-STANDING-RULES-1.0`

---

## Step 12 preview (do not build yet)

Availability should behave like an experienced scheduler, not a hard wall—**shaped by how Kelly and staff actually use the calendar**:

- Standing work blocks
- Tuesday Little Rock defaults
- Vacation overrides
- Travel feasibility
- Campaign priorities
- Required buffers
- Personal commitments
- Office hours
- Recurring campaign rhythms

Goal: help staff make good decisions **before** conflicts form.
Use this pass to shape Step 12; do not force users to adapt to the design.
