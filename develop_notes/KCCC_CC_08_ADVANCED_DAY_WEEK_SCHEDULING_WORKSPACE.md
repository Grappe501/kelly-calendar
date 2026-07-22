# CC-08 — Advanced Day/Week Scheduling Workspace

```text
Build ID:     KCCC-CC-08-ADVANCED-DAY-WEEK-SCHEDULING-WORKSPACE
Status:       COMPLETE (ship evidence appended at end of pass)
Authorization: ADR-096 · develop_notes/KCCC_CC_08_AUTHORIZATION_KELLY_2026-07-22.md
Standing:     ADR-094
Depends on:   CC-03 temporal · CC-04 recurrence · CC-05 availability · CC-06 conflicts · CC-07 query/saved views
```

## Mission

High-density Day and Week scheduling grids so operators can scan time, gaps, overlaps, availability, conflicts, recurrence, and Event context without losing filters or inventing mutations.

Measurable improvement: operators navigate dense schedules spatially, inspect Events in context, and create/edit only through intentional confirmed flows (no drag/resize).

## Grid authority

Deterministic pure layout in `src/lib/calendar/scheduling/`:

- `layoutCampaignDay` / `layoutCampaignWeek`
- Half-open intervals; touching Events do not overlap
- Campaign-local day windows via CC-03 (`chicagoDateKeyToUtcBounds`, `dayMembershipKind`)
- No persistence of layout positions or display segments
- No Event/Mission/conflict writes from layout

Layout preferences (visible hours, density, weekend/workweek, overlays) ride CC-07 query/saved-view keys (`layoutVisibleStartHour`, …) — **no CC-08 schema migration**.

## Routes

Canonical:

- `/calendar?view=day&date=YYYY-MM-DD` (+ CC-07 + layout query keys)
- `/calendar?view=week&date=YYYY-MM-DD`

Slot create (preview only until confirm): `/add/quick?date=&start=`

Full mutate: `/events/[id]` event sheet

No duplicate `/calendar/schedule/*` product routes.

## Behavior

| Surface | Behavior |
|---------|----------|
| Day grid | Hour/half guides, all-day lane, timed blocks, outside-hours note, now line, Now action |
| Week grid | Seven columns (or workweek via `layoutWorkweekOnly`), all-day span row, per-day grids |
| Overlap | Deterministic lane packing; visual overlap ≠ CC-06 conflict unless conflict records say so |
| Inspector | Side panel; Escape/close; open full sheet; no duplicate mutation |
| Slot create | Click/keyboard empty hour → quick add with normalized start; selection alone creates nothing |
| Filters | CC-07 `allowedEventIds` applied to Day/Week; date nav preserves query + layout keys |
| No-drag | Explicit copy + validator forbids drag libraries / drag handlers |

## Validation

`npm run calendar:scheduling-workspace:validate`

## Exclusions (binding)

- Drag-and-drop / resize mutation
- CC-09 bulk / archive / recovery
- Phase Two (ADR-093)
- ICS, push, AI, RedDirt, Mobilize

## Rollback

See `develop_notes/KCCC_CC_08_ADVANCED_DAY_WEEK_SCHEDULING_WORKSPACE_ROLLBACK.md`.

## Ship evidence

| | |
|--|--|
| Feature commit | `7486aa9` |
| Evidence commit | `1e7eff1` |
| Netlify feature deploy | `6a611dc19547e64f0fa7874d` |
| Netlify evidence deploy | `6a611f648426882fe7050d77` |
| Live URL | https://kelly-calendar.netlify.app |
| Validator | `calendar:scheduling-workspace:validate` — 102 passed |
| Layout unit tests | 14 passed |
| CC-03…CC-07 regressions | green |
| Typecheck | green |
| Production build | green |
| Migration | none (layout prefs via CC-07 query/saved-view keys) |
| Viewing mutations | 0 (layout pure; no Event create from grid render) |

CC-07 closeout preserved: commit `a630c8c` · deploy `6a61167b80d9714ef4541631`.
