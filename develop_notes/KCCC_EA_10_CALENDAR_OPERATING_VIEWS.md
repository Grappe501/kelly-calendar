# KCCC-EA-10 — Calendar Operating Views 1.0

**Status:** COMPLETE  
**Build ID:** `KCCC-EA-10-CALENDAR-OPERATING-VIEWS-1.0`  
**Date:** 2026-07-21  

## Philosophy

Step 10 is an **operator experience**, not a UI catalog.

| Lens | Question |
|------|----------|
| Today | What do I need to do today? |
| Day | How does my entire day flow? |
| Week | What is this week trying to accomplish? |
| Month | Where are the campaign peaks? |
| Agenda | What must eventually happen? |

Secondary lenses (designed + thin projections): Travel, Preparation, Follow-up, Conflicts, People, Counties, Mission.

## Architecture rule

```text
Canonical Event Repository
        ↓
Operating View projection
        ↓
Presentation
```

- One ranged Event query (`listEventsForActorInRange` / `loadEventGraph*`)
- Many lenses — **no** competing Event models or per-view catalogues
- Mission remains a projection attached to Event

## Code map

| Piece | Path |
|-------|------|
| Lens ids / questions | `src/lib/calendar/operating-view-lenses.ts` |
| Secondary projections | `src/lib/calendar/project-event-lenses.ts` |
| Graph loader | `src/server/services/operating-views/load-event-graph.ts` |
| Today (flagship) | `src/server/services/today-operating-view-service.ts` · `/` |
| Day / Week / Month / Agenda | `calendar-*-view-service.ts` · `/calendar?view=` |
| Secondary ops | `/calendar/ops/[lens]` |

## Acceptance

```text
[x] Today answers mission-driven “what do I need to do”
[x] Day / Week / Month / Agenda read same Event graph
[x] Week surfaces accomplishment themes (not only Mon–Sun columns)
[x] Month marks overloaded / empty weeks
[x] Agenda chronological + searchable
[x] Secondary lenses as Event projections (no new models)
[x] One source → many lenses
[x] Communications OS remains frozen
```

## Success bar

Kelly can run a day from **Today** without thinking about modules: where she is going, what to prepare, who she meets, what to do after.
