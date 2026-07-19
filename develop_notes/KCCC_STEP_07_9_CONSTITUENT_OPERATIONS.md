# KCCC Step 7.9 — Voter & Constituent Operations

**Script ID:** `KCCC-STEP-07.9-CONSTITUENT-OPERATIONS`  
**Status:** IN PROGRESS  
**Parent:** Step 7 Campaign Operations  

## Doctrine

> Voter & Constituent Operations answers: **Who are we serving, where are we building support, and what relationships require attention?**

Not a generic CRM or voter-file warehouse.

## Decision doctrine

> The Campaign Operating System exists to help people make better operational decisions. Data is collected only when it improves campaign execution.

## Canonical ownership

Owns relationship readiness signals: follow-up open/overdue counts, FOLLOWUP_OWNER assignment, relationship objectives, EventPerson/EventOrganization presence counts (no PII), engagement readiness.

Unknown: voter engagement status, target constituencies, endorsements, issue resonance, engagement momentum, canvassing person lists.

## Surfaces

- `/constituents`
- `GET /api/command-summary/constituents`

## Feeds

Executive · County · Field · Volunteer · Communications
