# KCCC Step 6 — Pilot Acceptance Gate

**Status:** PENDING PRODUCTION OPERATOR ACCEPTANCE  
**Mode:** Pilot acceptance (not a developer demo)  
**Engineering quality:** PASS  
**Architecture:** PASS  
**Operational model:** PASS  
**Step 6 complete:** NO — do not mark complete; do not open Step 7 until ACCEPT  
**Production feature tip:** `08ada56`  
**Gate docs tip:** see latest commit on `main`  
**Production URL:** https://kelly-calendar.netlify.app  
**Date recorded:** 2026-07-19  

## Standing decision

Closure is an **operator pilot**, not an engineering review. During the session, elegance of code is irrelevant. The test is whether the application disappears and the work becomes obvious.

If the operator ever stops and thinks *"How do I do this?"*, that is a usability HOLD — even if the backend is correct.

## Pilot personas (same session)

Use production only, as if you were:

1. **Kelly** preparing for today’s schedule  
2. **A field director** coordinating multiple events  
3. **A volunteer lead** checking the next assignment  

## Shipped increments (engineering complete)

| Increment | Engineering |
|-----------|-------------|
| Today command surface | PASS |
| Mission Cards (6.2) | PASS |
| Mission Timeline Engine (6.3) | PASS |
| Today’s Readiness (6.4) | PASS |
| One-Tap Completion (6.5) | PASS |
| Campaign Brief (6.6) | PASS |

## What the walkthrough evaluates

### Orientation (first 10 seconds)

The app must answer without exploration:

- Where do I go next?
- What is most important?
- What needs my attention?

**Accept if:** Orient in under 10 seconds; anxiety goes down, not up.

### Mission execution (full lifecycle)

```text
Sign in
→ Today
→ Next Mission
→ Timeline
→ Readiness
→ Start
→ Arrived
→ Complete
→ Return to Today
```

**Accept if:** Every transition feels natural — completing work, not editing records.

### Campaign Brief (executive dashboard)

With ~30 seconds before a meeting, can this screen answer:

- What’s going well?
- What’s at risk?
- What’s the next decision?

**Accept if:** Hierarchy puts the most important problem first; no hunting.

### Failure handling

Intentionally exercise:

- empty day
- blocked mission
- missing owner
- conflict handling
- retry behavior
- loading state
- error messaging

**Accept if:** The operator never wonders what happened or what to do next.

### Mobile thumb test

One-handed primary actions; no tiny controls; no accidental taps.

### Campaign realism (synthetic day)

Multiple counties, overlapping volunteers, travel, one blocked mission, one missing owner, one completed, one in progress.

Ask: Would I trust this while running a statewide campaign?

## Explicitly out of scope for this ACCEPT

Do **not** let these influence Step 6:

- live traffic integration
- Google Calendar authority
- AI autonomy
- advanced analytics
- CRM workflows
- campaign communications
- large-scale reporting

## Sign-off matrix (all required)

```text
Today Command Surface ........ ACCEPT / HOLD
Mission Cards ................ ACCEPT / HOLD
Mission Timeline ............. ACCEPT / HOLD
Today's Readiness ............ ACCEPT / HOLD
One-Tap Completion ........... ACCEPT / HOLD
Campaign Brief ............... ACCEPT / HOLD
Operator Workflow ............ ACCEPT / HOLD
Mobile Experience ............ ACCEPT / HOLD
Production Reliability ....... ACCEPT / HOLD
Failure Recovery ............. ACCEPT / HOLD
```

Record ACCEPT only when every line is ACCEPT. Then:

```text
KCCC STEP 6 — COMPLETE
KCCC STEP 7 — OPEN
```

## Step 7 charter (locked before open)

> **Step 7 is Campaign Operations.** It should extend the command system into planning, coordination, and execution—not become a generic CRUD interface for events.

Product question for every Step 7 feature:

> What does the campaign need me to do right now?

Never:

> How do I edit this event record?

## After ACCEPT (agent / ops checklist)

1. Update `data/build_state.json`: `step6_status=complete`, `step6_operator_acceptance=accepted`, move Step 6 into `completed_steps`, set `next_step` to Step 7.  
2. Commit closure record with ACCEPT matrix.  
3. Open Step 7 only under the Campaign Operations charter above.
