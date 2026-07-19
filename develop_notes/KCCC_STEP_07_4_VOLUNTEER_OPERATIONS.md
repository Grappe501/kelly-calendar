# KCCC Step 7.4 — Volunteer Operations

**Script ID:** `KCCC-STEP-07.4-VOLUNTEER-OPERATIONS`  
**Status:** IN PROGRESS  
**Parent:** Step 7 Campaign Operations  

## Doctrine

> Volunteer Operations answers: **Do we have enough people to execute the plan?**

Not: “Who is in the database?”

## Canonical ownership

Owns:

- Mission role fill (assigned / required / open)  
- Staffing + assignment confidence  
- County open roles / coverage when a staffing plan exists  
- Recruitment priority from open roles  

Remains first-class **Unknown** until sub-surfaces exist:

- Available volunteer pool / roster  
- Leadership bench  
- Skills, certifications, training completion  
- Replacement options / backup leaders  
- County volunteer coordinator registry  

## Surfaces

- `/volunteers` — capacity home  
- `GET /api/command-summary/volunteers` — authenticated JSON  

## Feeds

- `executiveFeed` → Executive Command  
- `countyFeed` → County Operations  
- `fieldFeed` → Field Operations (confidence signals only)

## Unknown doctrine

Unknown is not zero, false, empty, or assumed. It means the owning fact is not yet available.
