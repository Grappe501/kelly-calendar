# Kelly Authorization — CC-06 Conflict Engine (Calendar Slice)

```text
Decision ID:   ADR-092
Authority:     Kelly Grappe
Date:          2026-07-22
Scope:         CC-06 only
Status:        ACCEPTED
Program:       KCCC-CALENDAR-COMPLETION-PROGRAM-1.0
Separate from: ADR-090 (CC-05 only) · ADR-091 (usability pass direction)
```

## Decision

Kelly explicitly authorizes implementation of **CC-06: Conflict Engine — Calendar Slice**.

This authorization is **separate from ADR-090** and applies **only to CC-06**.

## Authorized scope

CC-06 may:

- Consume CC-03 normalized temporal intervals
- Consume CC-04 recurrence and occurrence identities
- Consume CC-05 `AvailabilityAssessment`
- Detect and persist explainable calendar conflicts
- Detect direct time overlaps
- Detect approved availability violations
- Detect explicitly supportable buffer conflicts
- Detect travel infeasibility only from stored travel facts
- Present conflicts in calendar views and a protected operator queue
- Support acknowledgement, accepted risk, resolution, and not-applicable dispositions
- Recompute and stale findings deterministically
- Preserve full audit history

## Binding restrictions

CC-06 must **not** automatically:

- Move, cancel, confirm, archive, restore, or delete Events
- Change Event status
- Change recurrence rules or occurrence exceptions
- Change availability rules
- Create or modify Missions
- Start or complete Mission execution
- Change Travel, Logistics, Field Ops, Staffing, Closeout, or Launch state
- Invent travel duration, distance, traffic, or routing
- Mark acknowledged conflicts resolved
- Resolve conflicts merely because an Event ended
- Write to Google, iCal, Mobilize, or another provider

`ACKNOWLEDGED` does **not** clear a blocker.

Every conflict must be explainable from stored facts, have a stable key, preserve history, and require an explicit operator action for any underlying calendar change.

## Usability record

The formal Operator Usability Synthesis remains **incomplete**. Do **not** mark it complete because of this authorization.

## Related

- Architecture: `develop_notes/KCCC_EA_13_CONFLICT_ENGINE_ARCHITECTURE.md`
- CC-07 remains a **separate** deliverable and is **not** implemented as part of CC-06
- Design brief for CC-07: `develop_notes/KCCC_CC_07_UNIFIED_SEARCH_FILTERS_SAVED_VIEWS_DESIGN.md`
