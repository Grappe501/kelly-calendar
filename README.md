# Kelly Campaign Command Calendar (KCCC)

**Kelly Grappe for Arkansas — standalone campaign scheduling operating system**

| Field | Value |
|-------|-------|
| **Working name** | Kelly Campaign Command Calendar |
| **Shorthand** | KCCC |
| **Lane path** | `H:\SOSWebsite\kelly-calendar\` |
| **GitHub** | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| **Deploy target** | Netlify (separate site from RedDirt) |
| **Election anchor** | Configurable (`NEXT_PUBLIC_ELECTION_DATE`, default `2026-11-03`) |
| **Timezone** | `America/Chicago` |

---

## Product purpose

Not a generic calendar with campaign colors. **Kelly’s daily operating system** — a mobile-first, AI-assisted command center that answers:

> **Where do I need to be, when do I need to leave, what do I need to know, who will be there, and what must happen next?**

---

## Current application status

| Item | Status |
|------|--------|
| **Build step** | **Step 2 of 25 complete** — Standalone Application Scaffold |
| **Next step** | Step 3 — Environment and Security Layer |
| **Auth** | Not enabled |
| **AI** | Not enabled (proposal-only doctrine later) |
| **Calendar DB tables** | None yet (Step 5) |
| **Event creation** | Not available (Step 7) |

> **Do not enter real candidate schedule information until authentication and database protections are implemented.**

---

## Technology stack

- Next.js 16 App Router · React 19 · TypeScript
- PostgreSQL via Prisma placeholder (no models in Step 2)
- Zod · Vitest · Playwright · ESLint
- Netlify (`@netlify/plugin-nextjs`)

---

## Start here (humans and AI)

1. [`docs/MASTER_PRODUCT_CONSTITUTION.md`](docs/MASTER_PRODUCT_CONSTITUTION.md)
2. [`docs/H_DRIVE_FOREVER_PROTOCOL.md`](docs/H_DRIVE_FOREVER_PROTOCOL.md)
3. [`docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md`](docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md)
4. [`develop_notes/KCCC_STEP_02_IMPLEMENTATION_REPORT.md`](develop_notes/KCCC_STEP_02_IMPLEMENTATION_REPORT.md)
5. [`develop_notes/KCCC_NEW_THREAD_HANDOFF.md`](develop_notes/KCCC_NEW_THREAD_HANDOFF.md)

---

## Local setup (H-drive)

```powershell
New-Item -ItemType Directory -Force -Path `
  "H:\SOSWebsite\.cache\npm", `
  "H:\SOSWebsite\.cache\temp", `
  "H:\SOSWebsite\.cache\playwright", `
  "H:\SOSWebsite\.cache\next", `
  "H:\SOSWebsite\.cache\prisma" | Out-Null

$env:TEMP="H:\SOSWebsite\.cache\temp"
$env:TMP="H:\SOSWebsite\.cache\temp"
$env:npm_config_cache="H:\SOSWebsite\.cache\npm"
$env:PLAYWRIGHT_BROWSERS_PATH="H:\SOSWebsite\.cache\playwright"

cd H:\SOSWebsite\kelly-calendar
node scripts/run-with-h-drive-env.cjs npm install
```

Optional: copy `.env.example` → `.env.local`, or rely on RedDirt env fallback for `DATABASE_URL` (Step 3 hardens this).

---

## Commands

```powershell
cd H:\SOSWebsite\kelly-calendar
npm run dev
npm run build
npm run check
npm run step2:validate
npm run db:diagnose
```

---

## Route inventory

| Route | Purpose |
|-------|---------|
| `/` | Today shell |
| `/calendar` | Calendar shell |
| `/add` | Add preview (Step 7) |
| `/search` | Search shell |
| `/more` | System links |
| `/system/status` | Status UI |
| `/api/health` | Health JSON |
| `/api/system/status` | Capability JSON |

---

## Safety statements

- **Database:** Shared RedDirt Postgres allowed later; Step 2 performs read-only diagnostics only — no migrations/mutations.
- **Authentication:** Development shell only — not production-safe for candidate schedules.
- **AI:** No OpenAI calls in Step 2. Future AI is proposal-only with human approval.
- **Secrets:** Never commit `.env.local`. Never put `OPENAI_API_KEY` in `NEXT_PUBLIC_*`.

---

## Deployment status

GitHub remote exists. Netlify site connection is an operator action (see `develop_notes/KCCC_STEP_02_DEPLOYMENT_REPORT.md`).

---

## Exact next step

**KCCC-STEP-03-ENV-SECURITY** — validated environment loading, RedDirt fallback controls, startup diagnostics.
