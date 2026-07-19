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
2. **Field Operations** — Mission execution, help queue, check-ins, escalation.  
3. **Volunteer Operations** — Capacity, assignments, open roles, recruitment priority.  
4. **Travel & Logistics** — Routes, lodging, vehicles, event preparation, travel timing, resources.  
5. **Communications Operations** — Debate prep, media schedule, speaking engagements, briefing packets, follow-up.  
6. **County Operations** — County readiness, leadership, statewide weakness, command nodes.  
7. **Operational Intelligence** — Staffing gaps, conflicts, workload balancing, advisory insights (AI advisory only).  
8. **After-Action & Accountability** — Mission completion, lessons learned, follow-up commitments, performance tracking.

## Standing constraints

- Authenticated mutations, RBAC, version/conflict protection, audit remain required.  
- Safe projections only; no real candidate PII until separately certified (`candidate_data_ready` false).  
- AI remains advisory unless a later step explicitly authorizes broader use.  
- No cross-lane imports from RedDirt/AJAX/PhatLip/countyWorkbench/sos-public without an approved integration packet.  
- Shared `OPENAI_API_KEY` usage must attribute `application=kelly-calendar` in AI audit metadata.

## Integration principle (permanent)

> Every module must both consume information from another module and produce information for another module.

```text
Calendar → Mission → Field Operations → Volunteer Operations
→ County Operations → Executive Command → Campaign Brief
→ Operational Intelligence → Calendar
```

## Canonical source principle (permanent)

> Every operational fact should have exactly one canonical source and may be consumed by many modules.

Examples:

- Mission status / field help → owned by Field Operations  
- County readiness / weakness grouping → owned by County Operations  
- Volunteer capacity / open roles → owned by Volunteer Operations  
- Executive summary → owned by Executive Command  
- Calendar timing → owned by the Calendar  

## Unknown principle (permanent)

> **Unknown is a first-class operational state.**

It is not zero, false, empty, or assumed.

It means:

> “This information is not yet available because its owning module has not been implemented.”

Leadership must be able to distinguish “we have no volunteers” from “we don’t yet have volunteer data.”

## Doctrine questions

- Executive Command: What does leadership need to know?  
- Field Operations: Who needs help right now?  
- County Operations: Where are we weak?  
- Volunteer Operations: Do we have enough people to execute the plan?

## Campaign Operations Pyramid

```text
                    EXECUTIVE COMMAND
             "What does leadership need to know?"
                         ▲
                COUNTY OPERATIONS
              "Where are we weak?"
                         ▲
                FIELD OPERATIONS
             "Who needs help right now?"
                         ▲
                VOLUNTEER OPERATIONS
        "Do we have enough people to execute?"
                         ▲
                     CALENDAR
           "What must happen, and when?"
```

## Active increments

| Increment | Route | Question | Status |
|-----------|-------|----------|--------|
| 7.1 Executive Command | `/command` | What does leadership need to know? | SHIPPED |
| 7.2 Field Operations | `/field` | Who needs help right now? | ACCEPTED |
| 7.3 County Operations | `/counties` | Where are we weak? | ACCEPTED |
| 7.4 Volunteer Operations | `/volunteers` | Do we have enough people to execute the plan? | IN PROGRESS |

See step docs under `develop_notes/KCCC_STEP_07_*.md`.
