# Kelly Waiver — CC-05 Standing Availability Inputs (calendar-only)

```text
Decision ID:   ADR-090
Authority:     Kelly Grappe
Date:          2026-07-22
Scope:         CC-05 only
Status:        ACCEPTED
Program:       KCCC-CALENDAR-COMPLETION-PROGRAM-1.0
Build script:  Cursor/Burt Build Script — CC-05 (Standing Availability Inputs — Calendar Slice)
```

## Decision

Kelly explicitly waives the unfinished **Operator Usability Synthesis** gate for **CC-05 only**.

This waiver authorizes implementation of the **calendar-only Standing Availability Inputs slice** described in the approved CC-05 build script.

## Conditions (binding)

1. CC-05 remains availability **input**, **evaluation**, **overlays**, and **create/reschedule warnings** only.
2. CC-05 may **not** automatically move, cancel, confirm, or resolve Events.
3. CC-05 may **not** mutate Missions or external calendars.
4. CC-05 may **not** create persisted Conflict Engine records (`OperationalConflictRecord` or equivalent).
5. **CC-06 remains separately gated** and is **not** authorized by this waiver.
6. The incomplete Usability Synthesis must be preserved honestly — **do not** mark Synthesis complete because of this waiver.

## Gate evidence

| Gate path | Status |
|-----------|--------|
| Completed Operator Usability Synthesis | **NOT used** — `develop_notes/KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md` remains `EMPTY` |
| Explicit Kelly waiver (this document + ADR-090) | **SATISFIED** — 2026-07-22 |

## What remains gated

- Operator Usability Pass / Synthesis closeout (still OPEN / EMPTY)
- **CC-06 Conflict Engine** (requires its own authorization after CC-05)
- Automatic schedule mutation of any kind

## Authorization quote (operator)

> I, Kelly, explicitly waive the unfinished Operator Usability Synthesis gate for **CC-05 only**. This waiver authorizes implementation of the **calendar-only Standing Availability Inputs slice** described in the approved CC-05 build script.
