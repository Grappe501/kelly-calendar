# Environment Protocol

**Kelly Campaign Command Calendar (KCCC)**  
Version: **1.0.0**

---

## Purpose

KCCC reads approved secrets from RedDirt conventions without becoming structurally dependent on RedDirt code.

---

## Load order

```text
1. kelly-calendar/.env.local     (lane overrides — highest priority)
2. kelly-calendar/.env           (lane defaults — gitignored)
3. ../RedDirt/.env.local         (shared production/dev secrets — fallback)
4. ../RedDirt/.env               (shared defaults — fallback)
5. Netlify environment           (production deploy)
```

Implementation (Step 3): `src/lib/env/load-env.ts` validates and merges — never expose merge logic to client bundles.

---

## Required variables (by phase)

### Step 2–3 (scaffold + diagnostics)

| Variable | Client? | Notes |
|----------|---------|-------|
| `NODE_ENV` | No | Standard |
| `NEXT_PUBLIC_SITE_URL` | Yes | Netlify URL, no trailing slash |

### Step 4–5 (auth + database)

| Variable | Client? | Notes |
|----------|---------|-------|
| `DATABASE_URL` | No | Prisma connection |
| `DIRECT_URL` | No | Migrations / direct session |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Auth |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Anon key only |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server only |

### Step 16+ (AI)

| Variable | Client? | Notes |
|----------|---------|-------|
| `OPENAI_API_KEY` | **Never** | Server routes only |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |

### Optional

| Variable | Purpose |
|----------|---------|
| `KCCC_ELECTION_DATE` | Default `2026-11-03` |
| `KCCC_DEFAULT_TRAVEL_BUFFER_MIN` | Default `15` |
| `KCCC_DEFAULT_PARKING_BUFFER_MIN` | Default `10` |
| `ADMIN_SECRET` or lane-specific auth | If not using Supabase-only auth |

---

## Database namespace

Use PostgreSQL schema **`kelly_calendar`**:

```sql
CREATE SCHEMA IF NOT EXISTS kelly_calendar;
```

Prisma (Step 5):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["kelly_calendar"]
}
```

**Never** point KCCC migrations at RedDirt tables (`WorkflowIntake`, etc.).

---

## Secret rules

1. Never commit `.env`, `.env.local`, or real keys
2. Never use `NEXT_PUBLIC_` prefix on secrets
3. Never log `OPENAI_API_KEY`, `DATABASE_URL`, or service role keys
4. `.env.example` documents keys with empty values only
5. Netlify: set variables in site settings; redeploy after changes

---

## Local development setup

```powershell
# Option A — lane-only override file
cd H:\SOSWebsite\kelly-calendar
copy .env.example .env.local
# Edit .env.local with lane-specific overrides

# Option B — rely on RedDirt secrets (recommended when already configured)
# Ensure H:\SOSWebsite\RedDirt\.env.local exists with DATABASE_URL, OPENAI_API_KEY, Supabase keys
# KCCC loader falls back automatically (Step 3)
```

---

## Startup validation (Step 3)

On `npm run dev` and production boot:

```text
✓ Required vars present
✓ DATABASE_URL reachable (optional warn in dev)
✓ OPENAI_API_KEY format check (if AI routes enabled)
✓ NEXT_PUBLIC_SITE_URL is HTTPS in production
✗ Fail fast with actionable message — no silent undefined behavior
```

---

## Netlify production checklist

Set in Netlify → Site configuration → Environment variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NEXT_PUBLIC_SITE_URL` → `https://<kelly-calendar-site>.netlify.app`

Use **direct** Postgres connection for `DIRECT_URL` when pooler is transaction mode (same rule as RedDirt).

---

## Relationship to RedDirt `.env.example`

Reference: `H:\SOSWebsite\RedDirt\.env.example`

KCCC does not duplicate every RedDirt variable — only those listed above. Campaign-specific public URLs stay on RedDirt deploy.

---

## Version history

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-07-17 | Initial protocol |
