# KCCC Step 7.2 — Field Operations

**Script ID:** `KCCC-STEP-07.2-FIELD-OPERATIONS`  
**Status:** IN PROGRESS  
**Parent:** Step 7 Campaign Operations  

## Doctrine

> Executive Command asks: **What does leadership need to know?**  
> Field Operations answers: **Who needs help right now?**

## Mission

Mission execution — not volunteer CRM.

## Surfaces

- `/field` — Field Operations home  
- `GET /api/command-summary/field` — authenticated JSON  
- Check-ins via existing authenticated mission-day mutations  

## Integration

Field Operations **produces** a feed consumed by Executive Command.  
No duplicate readiness/timeline engines.

## Standing principle (Campaign Operations)

> Every module must both consume information from another module and produce information for another module.
