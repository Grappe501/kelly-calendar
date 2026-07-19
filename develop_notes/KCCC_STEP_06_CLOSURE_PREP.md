# KCCC Step 6 — Operator Acceptance Gate

**Status:** PENDING PRODUCTION OPERATOR ACCEPTANCE  
**Engineering quality:** PASS  
**Architecture:** PASS  
**Operational model:** PASS  
**Step 6 complete:** NO — do not mark complete and do not start Step 7 until ACCEPT  
**Production tip at gate:** `08ada56`  
**Production URL:** https://kelly-calendar.netlify.app  
**Date recorded:** 2026-07-19  

## Standing decision

Steve will not accept Step 6 on engineering alone. Step 6 is the first surface campaign staff will live in. Closure requires a dedicated **20–30 minute production walkthrough** on the deployed site only (field-organizer hat, ~7:00 AM scenario).

## Shipped increments (engineering complete)

| Increment | Tip area | Engineering |
|-----------|----------|-------------|
| Today command surface | 6.1 | PASS |
| Mission Cards | 6.2 | PASS |
| Mission Timeline Engine | 6.3 | PASS |
| Today’s Readiness | 6.4 | PASS |
| One-Tap Completion | 6.5 | PASS |
| Campaign Brief | 6.6 | PASS |

## Official ACCEPT walkthrough

Perform entirely on production, mobile-first, one-handed where possible.

### 1. Morning launch (30 seconds)

- Can I tell where I need to be next without thinking?
- Do I immediately understand today’s priorities?
- Does the screen reduce anxiety instead of creating it?

**Accept if:** Orient in under 10 seconds.

### 2. Mission flow

Walk one mission: Card → Timeline → Readiness → Status → One-tap → return to Today.

**Accept if:** Feels like completing work, not editing records / navigating a database.

### 3. Campaign Brief

- Could Kelly glance before a meeting?
- Could a field director decide from this screen?
- Is the most important problem at the top?

**Accept if:** No hunting; hierarchy is clear.

### 4. Mobile thumb test

Every primary action reachable with the thumb. No accidental taps. No tiny controls.

### 5. Failure behavior

Intentionally test: offline/poor connection, stale data, 409 conflict, unauthorized action, empty day, partial readiness.

**Accept if:** App explains what happened and what to do next.

### 6. Campaign realism (synthetic day)

Create a synthetic day with: multiple counties, overlapping volunteers, travel, one blocked mission, one missing owner, one completed, one in progress.

Ask: Would I trust this while running a statewide campaign?

## Sign-off matrix (all required)

```text
Today surface ............... ACCEPT / HOLD
Mission Cards ............... ACCEPT / HOLD
Mission Timeline ............ ACCEPT / HOLD
Today's Readiness ........... ACCEPT / HOLD
One-Tap Completion .......... ACCEPT / HOLD
Campaign Brief .............. ACCEPT / HOLD
Operator flow ............... ACCEPT / HOLD
Mobile usability ............ ACCEPT / HOLD
Production behavior ......... ACCEPT / HOLD
Failure handling ............ ACCEPT / HOLD
```

Record ACCEPT only when every line is ACCEPT. Then mark Step 6 COMPLETE and unlock Step 7.

## Step 7 philosophy lock (pre-brief)

Do **not** let Step 7 become general CRUD.

Operator mindset must remain:

> “I’m running today’s campaign.”

Never:

> “I’m editing an event.”

## After ACCEPT

1. Update `data/build_state.json`: `step6_status=complete`, `step6_operator_acceptance=accepted`, move Step 6 into `completed_steps`, set `next_step` toward Step 7.
2. Commit tip of closure record.
3. Only then open Step 7 under the campaign-operations philosophy above.
