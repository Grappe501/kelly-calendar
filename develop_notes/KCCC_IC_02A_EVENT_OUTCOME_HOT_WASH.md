# IC-02A — Event Outcome and Hot Wash

```text
Status:       COMPLETE (implementation)
Authorization: ADR-105 · KCCC_IC_02A_AUTHORIZATION_KELLY_2026-07-23.md
Build:        KCCC-IC-02A-EVENT-OUTCOME-HOT-WASH-1.0
Migration:    20260723150000_ic02a_event_outcome_hot_wash
Validator:    npm run calendar:event-outcomes:validate
Baseline tip: c7e43db (pre-ship)
Feature:      b8c1e1c
Evidence tip: (see AUTHORITATIVE_TIP_COMMIT)
Deploy:       6a624c99e879a0702cdbee2d
Production:   https://kelly-calendar.netlify.app
```

## Product outcome

Mobile-friendly post-Event review after scheduled end (or cancelled/postponed
disposition). Operators record attendance outcome, operational outcome, what
happened, takeaways, encounters, commitments, and follow-up needs.

## Ship evidence (2026-07-23)

- Feature commit: `b8c1e1c`
- Netlify production deploy: `6a624c99e879a0702cdbee2d`
- Validator: `npm run calendar:event-outcomes:validate` (55 pass)
- DB decisive proof: `npm run calendar:event-outcomes:validate:db` (11 pass; cleanup restores counts)
- TypeScript `--noEmit`: green
- Production build: green
- Secret scan: clean
- ICS / CC-12 validators: green after IC-phase gate updates

## Fundamental rule

Time passing → `REVIEW_DUE` eligibility only. Never auto-complete. Never auto
not-attended. No Mission lifecycle mutation. No fabricated attendance/people/
consents/communications.

## Models

- `EventOutcomeReview` — optional 1:1, lazy-created on intentional write
- `EventHotWashEntry` — append-oriented; corrections append
- `EventEncounter` — people met without creating Person by default
- `EventOutcomeFollowUpLink` — soft link to `EventFollowup`
- `EventOutcomeAuditEntry` — append-only audit

Legacy thin `EventOutcome` remains untouched (not used by IC-02A UI).

## Eligibility

Service returns: `NOT_YET_DUE` | `REVIEW_DUE` | `DRAFT` | `REVIEWED` | `STALE` | `NOT_APPLICABLE`

## Routes

- `/system/events/[eventId]/outcome`
- `/system/events/[eventId]/hot-wash` → redirects to outcome
- `/system/calendar/reviews`
- `/system/calendar/reviews/report`

## APIs

- `GET/PATCH /api/events/[eventId]/outcome`
- `GET/POST /api/events/[eventId]/hot-wash`
- `POST /api/events/[eventId]/encounters`
- `POST /api/events/[eventId]/outcome/follow-up` (requires `confirmFollowUp: true`)
- `GET /api/events/[eventId]/outcome/report`
- `GET /api/calendar/reviews`

## Decisive proof (binding)

Allow one finished Event to become `REVIEW_DUE` without creating a database
record. Explicitly record `ATTENDED` + `COMPLETED`, add one takeaway and one
encounter, complete the review, then reload and reapply the same request with
zero duplicate reviews, takeaways, encounters, people, consents, communications,
Events, or Missions.

## Zero-auto-mutation guarantees

- elapsed-time Event mutations: 0
- automatically completed Events: 0
- automatically not-attended Events: 0
- automatically created Missions: 0
- automatically created people: 0
- automatically created consents: 0
- automatically sent communications: 0
- external writes: 0
- OpenAI calls: 0
- RedDirt writes: 0
- fabricated attendance: 0

## Related

- Rollback: `KCCC_IC_02A_EVENT_OUTCOME_HOT_WASH_ROLLBACK.md`
- Operator guide: `KCCC_EVENT_OUTCOME_HOT_WASH_OPERATOR_GUIDE.md`
- Encounter privacy: `KCCC_EVENT_ENCOUNTER_PRIVACY_POLICY.md`
- ADR: `ADR-105_EVENT_OUTCOME_INDEPENDENT_FACTS.md`
- IC-03 handoff updated to consume reviewed outcomes as attributed evidence (not implemented)
