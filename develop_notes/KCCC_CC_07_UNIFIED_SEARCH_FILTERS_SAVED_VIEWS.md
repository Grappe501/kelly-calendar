# CC-07 — Unified Search, Filters & Saved Views

```text
Build:        KCCC-CC-07-UNIFIED-SEARCH-FILTERS-SAVED-VIEWS-1.0
Status:       COMPLETE
Authorization: ADR-095 · standing ADR-094
Query schema: v1
```

## Mission

One permission-aware search and filter language across Today, Day, Week, Month, Agenda, Search, operational lenses, and saved views. Bookmarkable URL state. Private / campaign-shared / role-restricted saved views. Search and filter **reads** never mutate Events, Missions, availability, conflicts, recurrence, imports, or external systems.

## Count proof

| Metric | Before | After |
|--------|------:|------:|
| Events | 232 | 235 (unchanged by search; +3 external/other) |
| Missions | 37 | 37 |
| Saved views | 9 (system) | 9 |
| Private / shared operator views | 0 / 0 | 0 / 0 |
| Automatically created personal views | 0 | 0 |
| Operational mutations from search/filter | 0 | 0 |
| Phase Two product records | 0 | 0 |
| Fabricated records | 0 | 0 |

## Model / migration

- Extended `CalendarSavedView`: `queryJson`, `querySchemaVersion`, `campaignKey`, `visibility`, `roleScope`, `isPinned`, `staleState`, `createdByUserId`, `updatedByUserId`
- Migration: `prisma/migrations/20260722140000_cc07_saved_views_query_contract`

## Query schema version

**1** — `CALENDAR_QUERY_SCHEMA_VERSION`

## Routes / APIs

- UI: `/`, `/calendar`, `/search`, `/system/calendar/saved-views`, `/system/calendar/saved-views/[viewId]`
- `GET /api/calendar/search`
- `POST /api/calendar/search/normalize`
- `GET /api/calendar/search/facets`
- `GET|POST /api/calendar/saved-views`
- `GET|PATCH /api/calendar/saved-views/[viewId]`
- `POST .../duplicate|pin|archive|restore`

## Searchable field groups

Title, venue, city, county, organization, tags, calendar, event reference, source/external ref, permitted people, series, mission ref, authorized notes only.

## Filter groups

Status, calendar, date/relative, county, source/imported, mission, timed/all-day, recurrence, availability (CC-05), conflict (CC-06), integrity, cancelled/archived, tags.

## Saved-view visibility

`PRIVATE` · `CAMPAIGN_SHARED` · `ROLE_RESTRICTED` — no anonymous public views.

## Privacy

Visibility enforced before results/counts/facets. Confidential Events omitted entirely. Shared views never grant Event access. Search terms not logged.

## Ship evidence

| Item | Value |
|------|-------|
| Feature commit | `a630c8c` |
| Netlify deploy | `6a61167b80d9714ef4541631` |
| Query schema | v1 |
| `calendar:search:validate` | 60 passed |
| CC-05 / CC-06 regressions | 44 / 45 passed |
| TypeScript | `tsc --noEmit` clean |

## Rollback

See `KCCC_CC_07_UNIFIED_SEARCH_FILTERS_SAVED_VIEWS_ROLLBACK.md`.

## CC-08 handoff (design only)

**CC-08: Advanced Day/Week Scheduling Workspace**—high-density time-grid scheduling built on CC-03 temporal contracts and CC-07 query state. Grid-first remains binding. Drag-and-drop requires explicit safety proof. Not implemented in CC-07.
