# Database Namespace Protocol

**Owned schema:** `kelly_calendar`  
**Shared server:** RedDirt PostgreSQL infrastructure  
**Forbidden:** mutations to RedDirt-owned schemas/tables; `prisma migrate reset`; `prisma db push` against production

## Rules

1. All application tables use `@@schema("kelly_calendar")`.
2. Inspect migration SQL before apply.
3. Capture RedDirt structural snapshot before/after.
4. Apply only with `KCCC_ALLOW_SCHEMA_MIGRATION=1`.
5. Live row mutations require Step 4 AUTH-RBAC.
