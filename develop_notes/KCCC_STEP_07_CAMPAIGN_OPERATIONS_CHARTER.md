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

## Standing constraints

- Authenticated mutations, RBAC, version/conflict protection, audit remain required.  
- Safe projections only; `candidate_data_ready` false until certified.  
- AI remains advisory.  
- No cross-lane imports without an approved integration packet.  
- Shared `OPENAI_API_KEY` must attribute `application=kelly-calendar`.

## Integration principle (permanent)

> Every module must both consume information from another module and produce information for another module.

## Canonical source principle (permanent)

> Every operational fact should have exactly one canonical source and may be consumed by many modules.

## Unknown principle (permanent)

> **Unknown is a first-class operational state.**  
> Not zero, false, empty, or assumed.

## Artifact ownership principle (permanent)

> **Every operational artifact has one owner and many consumers.**

| Artifact | Canonical owner |
| -------- | --------------- |
| Mission status | Field Operations |
| County readiness | County Operations |
| Volunteer capacity | Volunteer Operations |
| Communications readiness | Communications Operations |
| Calendar timing | Calendar |
| Executive briefing | Executive Command |

## Doctrine questions

- Executive Command: What does leadership need to know?  
- County Operations: Where are we weak?  
- Field Operations: Who needs help right now?  
- Volunteer Operations: Do we have enough people to execute the plan?  
- Communications Operations: Is everyone communicating the same campaign?

## Active increments

| Increment | Route | Status |
|-----------|-------|--------|
| 7.1 Executive Command | `/command` | SHIPPED |
| 7.2 Field Operations | `/field` | ACCEPTED |
| 7.3 County Operations | `/counties` | ACCEPTED |
| 7.4 Volunteer Operations | `/volunteers` | ACCEPTED |
| 7.5 Communications Operations | `/communications` | IN PROGRESS |
