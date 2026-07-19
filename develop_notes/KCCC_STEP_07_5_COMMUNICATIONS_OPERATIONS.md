# KCCC Step 7.5 — Communications Operations

**Script ID:** `KCCC-STEP-07.5-COMMUNICATIONS-OPERATIONS`  
**Status:** IN PROGRESS  
**Parent:** Step 7 Campaign Operations  

## Doctrine

> Communications Operations answers: **Is everyone communicating the same campaign?**

Not an email client or social scheduler.

## Canonical ownership

Owns:

- Communications plan readiness (from `EventCommunicationsItem`)  
- Media/press commitment presence  
- Deadline risk / rapid-response open items  
- Messaging risk  
- Speaking-plan presence (SPEECH rows)  

Remains first-class **Unknown**:

- Today’s unified campaign message content  
- Interview booking inventory  
- Outbound send/delivery proof  
- Earned media / clips  
- Local messaging package copy  
- Handouts, press contacts, issue briefs, canvassing script version  

## Surfaces

- `/communications`  
- `GET /api/command-summary/communications`  

## Feeds

- `executiveFeed` → Executive Command  
- `countyFeed` → County Operations  
- `fieldFeed` → Field Operations  
- `volunteerFeed` → Volunteer Operations  

## Artifact ownership

Every operational artifact has one owner and many consumers.
