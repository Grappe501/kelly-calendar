# KCCC Step 5 — Deployment Report

## Application deploy (Netlify)

| Item | Status |
|------|--------|
| Local production build | PASS (`next build`) |
| Netlify site connection | BLOCKED — operator must connect site |
| Verified production URL | Not available |
| DATABASE_URL on Netlify | Operator must inject (same hosted Postgres; no secrets in git) |

## Database deploy

| Item | Status |
|------|--------|
| Target | Hosted Supabase/Postgres (shared with RedDirt) |
| Method | `prisma migrate deploy` via `npm run db:migration:apply` with `KCCC_ALLOW_SCHEMA_MIGRATION=1` |
| Schema | `kelly_calendar` only |
| RedDirt objects modified | **No** |
| Seed | Reference data only (no real candidate/donor/PII) |

## Operator actions required

1. Complete Step 4 AUTH-RBAC before enabling mutations.  
2. Confirm Netlify env: `DATABASE_URL`, `DIRECT_URL`, auth provider secrets.  
3. Optional: provision `SHADOW_DATABASE_URL` for CI drift checks.  
4. Do not run `prisma migrate reset` or `db push` against production.

## Rollback

Schema-only reverse under change control; never reset shared database. See backup/restore doc.
