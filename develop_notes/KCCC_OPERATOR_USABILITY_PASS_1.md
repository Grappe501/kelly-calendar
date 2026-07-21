# KCCC — Operator Usability Pass 1

```text
Status: OPEN — observation in progress
Gate: Blocks Step 12 (Availability & Standing Rules)
Live: https://kelly-calendar.netlify.app
After: Step 11 Event Operations (d8bd594)
Doc: develop_notes/KCCC_OPERATOR_USABILITY_PASS_1.md
Synthesis (after all sessions): develop_notes/KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md
```

## Observer Rules

_Establish before every session. One of the easiest ways to lose good usability data is unintentional steering._

```text
• Do not teach.
• Do not point.
• Do not finish sentences.
• Do not explain terminology.
• Do not suggest where to click.
• Answer only direct questions.
• Record behavior before interpretation.
```

---

## Operator Context

_Fill one block before each observation session. Context matters when reviewing later._

### Session — Kelly

| Field | Value |
|-------|-------|
| Operator | Kelly |
| Date / time | |
| Device | desktop · laptop · tablet · phone |
| Browser | |
| Experience level | first use · second use · other: ___ |
| Campaign context | planning tomorrow · entering a new event · reviewing the week · other: ___ |

### Session — Steve

| Field | Value |
|-------|-------|
| Operator | Steve |
| Date / time | |
| Device | desktop · laptop · tablet · phone |
| Browser | |
| Experience level | first use · second use · builder familiarity · other: ___ |
| Campaign context | planning tomorrow · entering a new event · reviewing the week · stress / edge cases · other: ___ |

### Session — Staff

| Field | Value |
|-------|-------|
| Operator | Staff (name): ___ |
| Date / time | |
| Device | desktop · laptop · tablet · phone |
| Browser | |
| Experience level | first use · second use · other: ___ |
| Campaign context | planning tomorrow · entering a new event · reviewing the week · other: ___ |

---

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

This is the first point where we intentionally **slow development** — not for lack of ideas, but because the product is finally usable enough for real operator behavior to guide the next phase.

---

## Success criteria

The pass succeeds when we can answer with confidence:

1. Can Kelly run her day from this application?
2. Can a staff member manage the schedule without training?
3. Does the interface encourage the correct workflow?
4. Are there obvious friction points that should be fixed before scheduling intelligence (Step 12)?

If any answer is “not yet,” fix (or consciously defer) before Availability Rules.

---

## How to capture each prompt

For every prompt or scenario, note approximate timings — not to optimize seconds, but because **long pauses often mean uncertainty**:

| Metric | Notes |
|--------|-------|
| Time to first click | |
| Time to complete | |
| Number of pauses | |
| Number of backtracks | |
| Needed assistance? | Y / N — if Y, what was asked? |

Do not defend the software during the session. Do not explain why something works the way it does. Just listen and write.

---

## Protocol

### A. Kelly session (30–60 min) — observe

Do **not** tell her where anything is.

Give **realistic requests**, then watch. If she hesitates, that is a design problem.

Suggested prompts (conversation, not a coached checklist):

- “Add tomorrow’s Rotary meeting.”
- “Move Friday’s fundraiser back an hour.”
- “Who are you meeting next Tuesday?”
- “Cancel next week’s county meeting.”
- “Show me everything in Pulaski County.”
- “What do you have to prepare today?”

| Prompt | First click | Time to first click | Time to complete | Pauses | Backtracks | Help? | Hesitation / expectation | Outcome |
|--------|-------------|---------------------|------------------|--------|------------|-------|--------------------------|---------|
| | | | | | | | | |

**Operator confidence (mark what you saw):**

- [ ] Confident
- [ ] Hesitant
- [ ] Frustrated
- [ ] Curious
- [ ] Surprised
- [ ] Lost
- [ ] Relieved

Notes on confidence shifts during the session:

>

**Magic moment**

> At what moment did the software start making sense?

Answer:

>

**Closing question** (ask only this; do not defend)

> If you could change one thing tomorrow, what would it be?

Answer:

>

**Evidence vs interpretation** (end of Kelly session)

_Separate what you saw from what you think it means. Redesign from evidence, not assumptions._

| Evidence (what happened) | Interpretation (possible meaning) |
|--------------------------|-----------------------------------|
| | |
| | |
| | |

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

| Scenario | First click | Time to first click | Time to complete | Pauses | Backtracks | Feels like campaign work? | Awkwardness | Notes |
|----------|-------------|---------------------|------------------|--------|------------|---------------------------|-------------|-------|
| | | | | | | Y / N | | |

**Operator confidence (mark what you felt / observed in yourself):**

- [ ] Confident
- [ ] Hesitant
- [ ] Frustrated
- [ ] Curious
- [ ] Surprised
- [ ] Lost
- [ ] Relieved

**Magic moment**

> At what moment did the software start making sense?

Answer:

>

**Closing question**

> If you could change one thing tomorrow, what would it be?

Answer:

>

**Evidence vs interpretation** (end of Steve session)

| Evidence (what happened) | Interpretation (possible meaning) |
|--------------------------|-----------------------------------|
| | |
| | |
| | |

---

### C. Staff session — most valuable

No interface explanation. Do not answer questions immediately.

Ask only something like:

> “Schedule tomorrow.”

When they stall, ask:

> “What are you looking for?”

Their wording tells us how the software should be organized.

Example: if they say “I’m trying to find tomorrow…,” maybe Today / Tomorrow / This Week deserves more prominence than traditional calendar chrome.

| Prompt / moment | First click | Time to first click | Time to complete | Pauses | Backtracks | Looking for (their words) | Help held back | Notes |
|-----------------|-------------|---------------------|------------------|--------|------------|---------------------------|----------------|-------|
| Schedule tomorrow | | | | | | | | |

**Operator confidence:**

- [ ] Confident
- [ ] Hesitant
- [ ] Frustrated
- [ ] Curious
- [ ] Surprised
- [ ] Lost
- [ ] Relieved

**Magic moment**

> At what moment did the software start making sense?

Answer:

>

**Closing question**

> If you could change one thing tomorrow, what would it be?

Answer:

>

**Evidence vs interpretation** (end of Staff session)

| Evidence (what happened) | Interpretation (possible meaning) |
|--------------------------|-----------------------------------|
| | |
| | |
| | |

Example of the separation we want:

| Evidence | Interpretation |
|----------|----------------|
| Kelly clicked Today three times before finding Week. | Week navigation may not be prominent enough. |
| Staff searched for "Rotary" instead of browsing dates. | Search may be a more natural entry point than calendar navigation. |
| Steve ignored Agenda throughout the session. | Agenda may need a clearer purpose or placement. |

---

## Closing answers — synthesis

_If Kelly, Steve, and staff converge on roughly the same change, that is almost certainly the highest-priority refinement before Step 12._

| Participant | One thing they would change tomorrow |
|-------------|--------------------------------------|
| Kelly | |
| Steve | |
| Staff | |

**Convergent theme (if any):**

>

---

## Magic moments — synthesis

_What the product’s true mental model is, according to when it “clicked.”_

| Participant | When it started making sense |
|-------------|------------------------------|
| Kelly | |
| Steve | |
| Staff | |

**Shared mental model (if any):** e.g. Today · one Event across views · prep on the card · …

>

---

## Operator Confidence — synthesis

| Emotion | Kelly | Steve | Staff | Notes |
|---------|-------|-------|-------|-------|
| Confident | | | | |
| Hesitant | | | | |
| Frustrated | | | | |
| Curious | | | | |
| Surprised | | | | |
| Lost | | | | |
| Relieved | | | | |

People often will not say they are confused; you will see it in behavior. Capture that here.

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

| Date | Operator | Device | Experience | Duration | Summary |
|------|----------|--------|------------|----------|---------|
| | Kelly | | | | |
| | Steve | | | | |
| | Staff | | | | |

---

## Decision gate

```text
Step 12 (Availability & Standing Rules) remains NOT AUTHORIZED
until:
  1. All three observation sessions are complete
  2. Synthesis is written: develop_notes/KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md
  3. Findings are reviewed here with Steve (evidence, not intuition)
  4. Must-fix items are cleared or explicitly deferred
```

Do **not** fix anything immediately after sessions. Capture → synthesize → review → then decide.

When ready to close:

- [ ] Observer Rules followed in every session
- [ ] Operator Context filled for each session
- [ ] Kelly observation complete (timings + confidence + magic moment + one change + evidence/interpretation)
- [ ] Steve edge-case session complete (same)
- [ ] Staff “Schedule tomorrow” session complete (or waived with reason)
- [ ] Closing-answer synthesis reviewed (convergent “one thing”?)
- [ ] Magic-moment synthesis reviewed
- [ ] Expected-vs-observed section filled
- [ ] Repeated behaviors section filled
- [ ] Success criteria answered
- [ ] **Synthesis doc written** (`KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md`)
- [ ] Findings brought back for review **before** Step 12 authorization
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
Once observation is complete and patterns are reviewed together, Step 12 and beyond should have an evidence-based roadmap.
