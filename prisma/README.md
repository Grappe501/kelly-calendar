# Prisma — Kelly Campaign Command Calendar

## Ownership

- This application will use **RedDirt’s existing PostgreSQL database**.
- Calendar-owned tables will live in an approved namespace (planned: `kelly_calendar`).
- **Step 2 creates no schema objects and no models.**

## Step boundaries

| Step | Responsibility |
|------|----------------|
| **2 (this scaffold)** | Placeholder Prisma config only — no migrations |
| **5** | First calendar migration, models, seed (fake data only) |
| Never | Edit RedDirt migrations from this repository |

## Forbidden commands (until Steve explicitly authorizes in a later step)

```text
prisma migrate dev
prisma migrate deploy
prisma migrate reset
prisma db push
```

## Step 2 confirmation

- Minimal `schema.prisma` exists with generator + datasource only.
- **No models.**
- Prisma client generation may run for toolchain readiness; it does **not** create tables.
- Read-only connectivity uses `scripts/check-red-dirt-db-connection.mjs` (`SELECT 1` only).
