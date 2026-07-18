# Shared RedDirt Database Protocol

## Principle

KCCC may share RedDirt’s PostgreSQL **instance** and use approved secrets via env fallback, but must not casually write RedDirt application tables.

## Step 2 rules

- Read-only probe only: `SELECT 1`
- No migrations
- No `prisma db push`
- No seeding
- No schema creation

## Later

- Step 5 introduces `kelly_calendar` namespace / namespaced tables
- RedDirt migrations remain owned by RedDirt
