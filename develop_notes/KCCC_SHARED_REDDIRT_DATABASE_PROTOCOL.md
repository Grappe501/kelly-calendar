# Shared RedDirt Database Protocol

## Principle

KCCC may share RedDirt’s PostgreSQL **instance** and use approved secrets via env fallback, but must not alter RedDirt-owned schemas, tables, migrations, or source.

## Ownership

| Concern | Owner |
|---------|--------|
| RedDirt `public` / app tables | RedDirt (read-only to KCCC) |
| Schema `kelly_calendar` | Kelly Calendar |
| Migration history for KCCC | `kelly-calendar/prisma/migrations` |
| Auth identities (future) | Step 4 — stable user IDs, no RedDirt table mutation |

## Step 5 rules

- All KCCC tables in `kelly_calendar.*`
- Preflight + classify target before migrate
- Capture RedDirt structural snapshot before/after (expect diff **0**)
- `prisma migrate deploy` only (never `migrate reset`, never production `db push`)
- Reference seed only inside `kelly_calendar`
- No real PII / no Google source URLs in plaintext seed

## Forbidden

- ALTER/DROP/RENAME RedDirt objects
- Changing RedDirt migrations or Prisma under `H:\SOSWebsite\RedDirt`
- Resetting the shared database
