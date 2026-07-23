# ADR-105 — Event outcome independent facts

```text
Status: Accepted
Date:   2026-07-23
Build:  KCCC-IC-02A-EVENT-OUTCOME-HOT-WASH-1.0
```

## Context

Campaign operators need post-Event review that can truthfully say an Event was
scheduled, attended or not, operationally completed or not, Mission-executed or
not, and review-completed or not — as **separate** facts.

Historical temptation: overload `EventStatus` (e.g. `COMPLETED`) to mean
“time passed,” “we showed up,” “ops succeeded,” and “Mission finished.” That
collapses distinct realities and poisons Mission Intelligence (IC-03).

## Decision

Treat these as **independent facts**:

| Fact | Authority |
|------|-----------|
| Scheduled time / status | Event schedule + `EventStatus` |
| Attendance outcome | `EventOutcomeReview.attendanceOutcome` |
| Operational outcome | `EventOutcomeReview.operationalOutcome` |
| Mission execution / debrief | Mission Execute / Debrief models |
| Review completion | `EventOutcomeReview.status` (`DRAFT` / `REVIEWED` / `STALE`) |

Elapsed campaign-local end time → eligibility `REVIEW_DUE` only.
No automatic attendance. No automatic operational completion. No automatic
Mission lifecycle change. No fabricated Person, consent, or communication.

`NOT_ATTENDED`, `CANCELLED`, and `EVENT_DID_NOT_OCCUR` remain distinct.

## Consequences

- Prefer `EventOutcomeReview` (+ hot wash / encounters) over overloading Event status
- Lazy create on intentional write only
- IC-03 may later consume **reviewed** outcomes as attributed evidence, distinct from planned intent
- ICS / broad boards never leak private hot-wash or encounter content
