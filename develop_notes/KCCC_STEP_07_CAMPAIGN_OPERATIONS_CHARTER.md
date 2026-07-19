# KCCC Step 7 — Campaign Operations Charter

**Script ID:** `KCCC-STEP-07-CAMPAIGN-OPERATIONS`  
**Status:** OPEN  
**Opened after:** Step 6 operator ACCEPT (2026-07-19)  
**Primary question:** What does the campaign need me to do right now?

## Purpose

Coordinate, direct, and execute campaign activities.

## Explicitly NOT

- CRUD for its own sake  
- Generic calendar management  
- Event administration as the product metaphor  

Operator mindset must remain:

> “I’m running today’s campaign.”

Never:

> “I’m editing an event record.”

## Recommended workstreams

1. **Executive Command** — Daily command center, campaign health, priorities, operational summaries.  
2. **Field Operations** — Volunteer assignments, county coordination, canvassing, check-ins, mission tracking.  
3. **Travel & Logistics** — Routes, lodging, vehicles, event preparation, travel timing, resources.  
4. **Communications Operations** — Debate prep, media schedule, speaking engagements, briefing packets, follow-up.  
5. **County Operations** — County readiness, leadership assignments, regional coordination, activity dashboards.  
6. **Operational Intelligence** — Staffing gaps, conflicts, workload balancing, advisory insights (AI advisory only).  
7. **After-Action & Accountability** — Mission completion, lessons learned, follow-up commitments, performance tracking.

## Standing constraints

- Authenticated mutations, RBAC, version/conflict protection, audit remain required.  
- Safe projections only; no real candidate PII until separately certified (`candidate_data_ready` false).  
- AI remains advisory unless a later step explicitly authorizes broader use.  
- No cross-lane imports from RedDirt/AJAX/PhatLip/countyWorkbench/sos-public without an approved integration packet.  
- Shared `OPENAI_API_KEY` usage must attribute `application=kelly-calendar` in AI audit metadata.

## Integration principle (permanent)

> Every module must both consume information from another module and produce information for another module.

```text
Calendar → Mission → Field Operations → Executive Command → Campaign Brief
→ County Operations → Operational Intelligence → Calendar
```

Doctrine pair:

- Executive Command: What does leadership need to know?  
- Field Operations: Who needs help right now?

## Active increments

| Increment | Route | Question |
|-----------|-------|----------|
| 7.1 Executive Command | `/command` | What does leadership need to know? |
| 7.2 Field Operations | `/field` | Who needs help right now? |

See `develop_notes/KCCC_STEP_07_1_EXECUTIVE_COMMAND.md` and `KCCC_STEP_07_2_FIELD_OPERATIONS.md`.
