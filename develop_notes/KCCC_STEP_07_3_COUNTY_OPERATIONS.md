# KCCC Step 7.3 — County Operations

**Script ID:** `KCCC-STEP-07.3-COUNTY-OPERATIONS`  
**Status:** IN PROGRESS  
**Parent:** Step 7 Campaign Operations  

## Doctrine

> Field Operations answers: **Who needs help right now?**  
> County Operations answers: **Where are we weak?**

## Mission

Every county is an operational command node — not a profile page.

## Surfaces

- `/counties` — statewide overview grouped by operational state  
- `/counties/[slug]` — county command node  
- `GET /api/command-summary/counties` — authenticated JSON  

## Canonical ownership

County readiness / operational grouping is owned here.

Consumes:

- Calendar mission signals (today)  
- Field Operations heat + help queue (no re-implementation)

Produces:

- `executiveFeed` consumed by Executive Command  

## Health score

Deterministic factors (explainable):

1. Leadership assigned  
2. Upcoming mission coverage  
3. Recent activity  
4. Outstanding needs  
5. Event readiness  
6. Check-in cadence  

AI may advise on patterns; never decides health score or group.
