# Kelly Authorization — CC-08 Advanced Day/Week Scheduling Workspace

```text
Decision ID:   ADR-096
Authority:     Kelly Grappe
Date:          2026-07-22
Scope:         CC-08 only
Status:        ACCEPTED
Program:       KCCC-CALENDAR-COMPLETION-PROGRAM-1.0
Standing auth: ADR-094
Separate from: ADR-090…ADR-095
```

## Decision

Kelly explicitly authorizes implementation and full ship cycle of **CC-08: Advanced Day/Week Scheduling Workspace**, including posture closeout of completed CC-07, planning, code, optional forward-only migration, validation, documentation, commit, push, Netlify deployment, corrective follow-ups, redeployment, and live verification.

Standing execution authorization (ADR-094) applies.

## CC-07 closeout (accepted as complete)

- Feature commit: `a630c8c`
- Evidence commit: `fa46ae6`
- Netlify deploy: `6a61167b80d9714ef4541631`
- `calendar:search:validate` green before commit
- No further CC-07 engineering follow-up

## Authorized scope

- High-density Day and Week time grids (grid-first)
- All-day lane, overnight/multi-day continuations
- Deterministic overlap layout
- Availability overlays (CC-05) and conflict indicators (CC-06)
- Event inspection panel, intentional slot creation, explicit edit entry points
- CC-07 query/saved-view integration
- Accessibility and narrow-screen usability foundations

## Binding restrictions

CC-08 must **not** implement:

- Drag-and-drop mutation
- Resize mutation
- Bulk operations (CC-09)
- ICS, push, AI, RedDirt, volunteer management, Phase Two product features
- View-triggered Event/Mission/availability/conflict mutations

Intentional create/edit may mutate only through existing canonical Event services.

## Usability Synthesis

Remains **EMPTY / incomplete**. Do not mark complete because of this authorization.

## Related

- Standing auth: ADR-094
- Phase Two: ADR-093 (vision only)
- CC-09 remains a separate deliverable
