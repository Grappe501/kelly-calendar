# KCCC Step 7.3 — County Operations

**Script ID:** `KCCC-STEP-07.3-COUNTY-OPERATIONS`  
**Status:** ACCEPTED (2026-07-19)  
**Parent:** Step 7 Campaign Operations  
**Tip:** `155373a`

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

Consumes Calendar + Field heat; produces `executiveFeed` for Executive Command.  
Volunteer capacity consumed from Volunteer Operations (7.4+).
