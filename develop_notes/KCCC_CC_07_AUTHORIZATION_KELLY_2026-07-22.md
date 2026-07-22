# Kelly Authorization — CC-07 Unified Search, Filters & Saved Views

```text
Decision ID:   ADR-095
Authority:     Kelly Grappe
Date:          2026-07-22
Scope:         CC-07 only
Status:        ACCEPTED
Program:       KCCC-CALENDAR-COMPLETION-PROGRAM-1.0
Standing auth: ADR-094
Separate from: ADR-090 · ADR-091 · ADR-092 · ADR-093
```

## Decision

Kelly explicitly authorizes implementation and full ship cycle of **CC-07: Unified Search, Filters, and Saved Views**, including planning, code, forward-only migration, validation, documentation, commit, push, Netlify deployment, corrective follow-ups, redeployment, and live verification.

Standing execution authorization (ADR-094) applies: do not ask for routine run/commit/push/deploy confirmation.

## Authorized scope

- One permission-aware, versioned calendar query contract
- Consistent search and filters across primary calendar surfaces
- Bookmarkable URL state without secrets/PII
- Private / campaign-shared / role-restricted saved views (no anonymous public views)
- Read-only consumption of CC-05 availability classifications and CC-06 conflict records
- Clean extension points for later CC work

## Binding restrictions

CC-07 must **not** implement:

- CC-08 scheduling grid, drag-and-drop, or Event resizing
- Bulk Event mutation
- ICS subscriptions, mobile push, AI recommendations
- RedDirt, new Mobilize behavior, volunteer management
- Phase Two product features or widened personal-data collection
- Mutations of Events, Missions, availability, conflicts, recurrence, imports, or external systems from search/filter/saved-view **reads**

## Usability record

Operator Usability Synthesis remains **EMPTY / incomplete**. Do not mark it complete because of this authorization.

## Related

- Design: `develop_notes/KCCC_CC_07_UNIFIED_SEARCH_FILTERS_SAVED_VIEWS_DESIGN.md`
- Standing auth: `develop_notes/KCCC_STANDING_KELLY_EXECUTION_AUTHORIZATION_2026-07-22.md`
- CC-08 remains a separate deliverable and is not implemented as part of CC-07
