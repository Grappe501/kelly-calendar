# KCCC Database Architecture

## Namespace

All owned tables: PostgreSQL schema **`kelly_calendar`**.

Prisma:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["kelly_calendar"]
}
```

Every model uses `@@schema("kelly_calendar")`.

## Canonical event

```text
One canonical event
  → primary calendar
  → zero or more related calendars (memberships)
  → operational plans (normalized)
  → permission-filtered SafeEventProjection
  → Command Calendar roll-up (policy surface)
```

Do not duplicate events for Travel / Communications / Social / Field when they share one real-world commitment.

## Major areas

A. Calendar registry (groups, calendars, memberships, team bindings, roll-up rules, saved views)  
B. Canonical events + visibility/section permissions  
C. Event operations (objectives, program flow, packing, staffing, actions, communications, travel)  
D. People / organizations  
E. Geography (75 counties, regions, places)  
F. Historical Google import persistence  
G. Templates  
H. Approvals + audit + data access log  
I. AI suggestion foundation (advisory only)

## Client boundary

Client components must not import Prisma. Server-only repositories under `src/server/`.

See also: `KCCC_CANONICAL_EVENT_MODEL.md`, `KCCC_FEDERATED_CALENDAR_MODEL.md`, `prisma/schema.prisma`.
