# Event Mutation Protocol

All event mutations resolve the actor from the server session, authorize a named action, validate input, check `expectedVersion` where applicable, mutate inside a transaction, write an attributed audit record, refresh readiness/conflict markers, and return a safe projection.

| Operation | Route | Action |
| --- | --- | --- |
| Create | `POST /api/events` | `EVENT_CREATE` |
| Update | `PATCH /api/events/[eventId]` | `EVENT_EDIT` (+ section actions) |
| Archive | `POST /api/events/[eventId]/archive` | `EVENT_ARCHIVE` |
| Restore | `POST /api/events/[eventId]/restore` | `EVENT_RESTORE` |
| Primary calendar | `POST /api/events/[eventId]/primary-calendar` | `EVENT_CHANGE_PRIMARY_CALENDAR` |
| Add calendar | `POST /api/events/[eventId]/calendars` | `EVENT_MANAGE_CALENDARS` |
| Remove calendar | `DELETE /api/events/[eventId]/calendars/[calendarId]` | `EVENT_MANAGE_CALENDARS` |

Hard rules: no hard-delete via ordinary APIs; version mismatch → 409; never accept actor identity from JSON.
