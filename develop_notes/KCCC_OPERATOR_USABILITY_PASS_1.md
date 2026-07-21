# KCCC — Operator Usability Pass 1

```text
Status: OPEN — capture in progress
Gate: Blocks Step 12 (Availability & Standing Rules)
Live: https://kelly-calendar.netlify.app
After: Step 11 Event Operations (d8bd594)
Doc: develop_notes/KCCC_OPERATOR_USABILITY_PASS_1.md
```

This is a **usability capture**, not a formal acceptance test and not a coding pass.

Record **hesitation and confusion** first. Bugs are secondary.

---

## Protocol

### A. Kelly Operator Test (30–60 min)

No instruction. Real campaign work.

Prompt only if needed: use the calendar as you would for a real day.

She should attempt to:

- [ ] Create events
- [ ] Move / reschedule events
- [ ] Cancel events
- [ ] Duplicate events
- [ ] Switch between Today and Week
- [ ] Find an event
- [ ] Edit participants
- [ ] Add preparation notes
- [ ] Archive an event

**Observer notes:** every pause, wrong click, or “where is…?” moment.

| Time | What she tried | Where she looked / clicked | Confusion / hesitation | Outcome |
|------|----------------|----------------------------|------------------------|---------|
| | | | | |

### B. Steve Stress Test

Intentionally awkward, even if it “works.”

- [ ] Rapid reschedule
- [ ] Duplicate recurring events
- [ ] Edit same event in multiple browser tabs
- [ ] Cancel completed events
- [ ] Move events across time zones / wall-clock ambiguity
- [ ] Change visibility repeatedly
- [ ] Create a week with 50+ events
- [ ] Search / find with unusual names

| Scenario | Awkwardness | Severity (H/M/L) | Notes |
|----------|-------------|------------------|-------|
| | | | |

### C. Staff Test (one person, no explanation)

Ask only:

> “Schedule tomorrow.”

Watch first click. Do not coach.

| First click / destination | Questions asked (“Where do I…?”) | Notes |
|---------------------------|----------------------------------|-------|
| | | |

---

## Friction points

_Capture moments that slow the operator down even when the system is “correct.”_

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

_Phone / small viewport notes. Skip if not tested._

1.
2.
3.

---

## Suggested improvements

_Product refinements suggested by the pass (not yet prioritized)._

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

_Improvements that can wait until after Availability / Conflict work._

| # | Idea | Notes |
|---|------|-------|
| 1 | | |
| 2 | | |
| 3 | | |

---

## Session log

| Date | Tester | Role | Duration | Environment | Summary |
|------|--------|------|----------|-------------|---------|
| | Kelly | Candidate / principal | | Production | |
| | Steve | Builder / stress | | Production | |
| | | Campaign staff | | Production | |

---

## Decision gate

```text
Step 12 (Availability & Standing Rules) remains NOT AUTHORIZED
until this pass is filled, reviewed, and must-fix items are cleared
or explicitly deferred by Steve.
```

When ready to close:

- [ ] Kelly session complete
- [ ] Steve stress session complete
- [ ] Staff “Schedule tomorrow” session complete (or waived with reason)
- [ ] Must-fix list reviewed
- [ ] Steve authorizes Step 12: `KCCC-EA-12-AVAILABILITY-STANDING-RULES-1.0`

---

## Step 12 preview (do not build yet)

Availability should behave like an experienced scheduler, not a hard wall:

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
