# KCCC Step 7.1 — Executive Command Center

**Script ID:** `KCCC-STEP-07.1-EXECUTIVE-COMMAND`  
**Status:** IN PROGRESS  
**Parent:** Step 7 Campaign Operations  
**Primary question:** If Kelly opens the system at 6:30 AM, what does she need to know in the next 60 seconds?

## Design doctrine

> Every new module must answer an executive question.

Executive Command answers: **What do I do today?**

Not a widget dashboard. An executive decision surface / morning briefing.

## Sections

1. Today’s Campaign — priorities, where Kelly needs to be, decisions, failure risks  
2. Campaign Health — missions / readiness / alerts (decision-useful only)  
3. Executive Inbox — approvals, conflicts, staffing gaps, commitments, deadlines (honest Unknown when unwired)  
4. Geographic Operations — county operational status for today (no invented statewide volunteer map)  
5. Campaign Rhythm — NOW → sequence of today’s execution blocks  
6. Executive Briefing — deterministic summary; optional advisory AI  

## Explicitly deferred / Unknown until later workstreams

- Live volunteer roster totals  
- Media / filing deadline feeds  
- Full interactive county choropleth map  
- AI autonomy  

## Route

- `/command` — primary Executive Command surface  
- `GET /api/command-summary/command` — authenticated JSON  

Linked from More + Today; bottom nav unchanged (maps to More).
