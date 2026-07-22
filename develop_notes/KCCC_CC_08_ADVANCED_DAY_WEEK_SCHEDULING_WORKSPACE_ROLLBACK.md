# CC-08 Rollback — Advanced Day/Week Scheduling Workspace

```text
Non-destructive · manual only · never automate destructive rollback
```

## Goals

- Disable advanced grid presentation without changing Event times
- Preserve CC-07 query/saved views and layout preference query keys
- Preserve Events, Missions, recurrence, availability, conflicts
- Optionally disable slot-create entry independently

## Disable advanced grid (UI)

1. Revert `src/components/calendar/DayView.tsx` and `WeekView.tsx` to prior list/column presentation (git history before CC-08 feature commit), **or** feature-flag by rendering the prior components behind an env gate if one is added later.
2. Keep `src/lib/calendar/scheduling/**` unused (safe; pure; no writes).
3. Leave `/calendar?view=day|week` routes intact.

## Preserve CC-07

- Do not drop `CalendarSavedView` / query-schema migration `20260722140000_cc07_saved_views_query_contract`.
- Layout preference keys in URLs/saved views are inert if unused.

## Disable slot creation only

- Remove or gate `onSlotSelect` / “Add Event” toolbar links in scheduling workspaces.
- Keep grid read-only; Event sheet edit path remains available.

## Schema

CC-08 ships **without** a new Prisma migration. No schema revert is required for CC-08.

## Never

- Do not rewrite Event `startsAt`/`endsAt` during rollback
- Do not delete Events, Missions, conflicts, or saved views
- Do not run destructive SQL automation

## Re-enable

Redeploy a commit that restores Day/Week workspace components and CSS.
