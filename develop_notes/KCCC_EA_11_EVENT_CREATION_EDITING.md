# KCCC-EA-11 — Event Creation & Editing 1.0

**Status:** COMPLETE  
**Build ID:** `KCCC-EA-11-EVENT-CREATION-EDITING-1.0`  
**Date:** 2026-07-21  

## Rule

Every create/edit path writes the same Prisma `Event`. Drafts, recurring instances, cancelled, and private events are **states/capabilities** of Event — not alternate tables.

## Operator loop

```text
Today → Add event (/add/quick) → canonical Event
      → Edit (/events/[id]/edit)
      → Reschedule / Cancel / Duplicate / Archive
      → Visible on Today / Day / Week / Month / Agenda / Ops lenses
```

## Capabilities

| Capability | Path |
|------------|------|
| Quick create | `/add/quick` → `POST /api/events` |
| Progressive edit | `/events/[eventId]/edit` |
| Publish / schedule | `POST …/publish` |
| Cancel (retained) | `POST …/cancel` → status `CANCELLED` |
| Reschedule (+ series scopes) | `POST …/reschedule` |
| Duplicate | `POST …/duplicate` |
| Archive | `POST …/archive` |
| Visibility / location / virtual | create + PATCH fields |
| People / prep / follow-up / objectives / staff | `POST …/details` |
| Audit history | editor page + `?history=1` |
| Lifecycle transitions | `src/lib/calendar/event-status-transitions.ts` |

## Safety

- Role-based write (`EVENT_CREATE` / `EVENT_EDIT` / …)
- Optimistic concurrency via `expectedVersion` (409 on stale)
- Timezone-safe Chicago wall times
- No hard delete in normal UI
- Series edit confirmation warning
- No communications / AI / external sync on create

## Next

```text
KCCC-EA-12-AVAILABILITY-STANDING-RULES-1.0
```

Do not start until create→edit→cancel loop is proven with Kelly/staff.
