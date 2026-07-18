# DEPLOYMENT_METADATA

**Step:** KCCC-STEP-05.7  
**Status:** BUILD FAILURE (repair in progress)  
**Date:** 2026-07-18

## Observed Netlify build (sanitized)

| Field | Value |
| --- | --- |
| Context | production |
| Package | kelly-campaign-command-calendar@0.5.7-proof |
| Config | netlify.toml present |
| Runtime | Next.js Runtime v5.15.12 |
| Build command (failed) | `npm ci && npm run build` |
| Classification | **BUILD FAILURE** — Prisma Client not generated on Netlify CI cache |

## Error (sanitized)

```text
PrismaClientInitializationError:
Prisma has detected that this project was built on Netlify CI, which caches
dependencies. Run prisma generate during the build process.
Failed to collect page data for /api/approvals/[approvalId]/request-changes
```

## Repair

Update `netlify.toml` build command to:

```text
npm ci && npx prisma generate && npm run build
```

No secrets recorded. Redeploy after this commit lands on `main`.
