# CC-07 Design — Unified Search, Filters & Saved Views

```text
Build:        KCCC-CC-07-UNIFIED-SEARCH-FILTERS-SAVED-VIEWS-1.0
Status:       DESIGN ONLY — NOT AUTHORIZED FOR IMPLEMENTATION
Designed:     2026-07-22 (alongside CC-06 authorization)
Depends on:   CC-06 complete, pushed, deployed, and documented
Does not:     Implement during CC-06 · absorb CC-08 grid/drag work
```

## Measurable improvement (when authorized)

> Operators can search and filter the complete calendar consistently from every primary view, save role-appropriate views, share safe filter definitions, and return to the same calendar context without mutating Events or exposing restricted information.

## Position

Follows CC-01…CC-06. Before implementation: verify CC-06 live; use final CC-01…CC-06 contracts; identify latest migration and production counts; preserve unrelated changes.

## Canonical query contract

Shared, versioned server-validated query used by Today / Day / Week / Month / Agenda / operational lenses:

- Free-text, date range, calendars, statuses, types/tags, counties, locations, orgs, people (permissioned)
- Local vs imported, source/provider, provenance, Mission link/status
- Timed/all-day, overnight/multi-day, recurrence/series
- Availability classification, conflict state/disposition/type, integrity finding state
- Visibility, archived/cancelled opt-in, sort, grouping, view mode, timezone context

Requirements: server parse/canonicalize; reject unauthorized fields; stable serialization; query-schema version; campaign-local dates; never trust client campaign scope.

## Search / filter / saved views (summary)

- Deterministic search over authorized fields; no confidential-match leakage; exact/prefix before fuzzy
- Filters consume CC-05/CC-06 outputs without recomputing/persisting conflicts on ordinary reads
- Reuse `CalendarSavedView` safely: PRIVATE / CAMPAIGN_SHARED / ROLE_RESTRICTED; no public anonymous views
- Relative “Today/This week” must not freeze to save date
- URL state bookmarkable without secrets/PII
- Multi-day Events count once in result totals

## Explicit non-goals

Drag-and-drop, Event resize, scheduling grid (CC-08), bulk mutation, public ICS, analytics, CRM/comms search, automatic Event changes, new conflict detection, availability-rule editing.

## Validation / ship (when authorized)

`npm run calendar:search:validate` plus CC-01…CC-06 regressions. Expected: operational mutations from search **0**; auto personal views **0**; fabricated records **0**.

Full build script retained in operator conversation / agent transcript; implementation waits for separate Kelly/Steve authorization after CC-06 ships.

## Handoff

**CC-08** remains grid-first scheduling workspace. Do not begin CC-08 during CC-07.
