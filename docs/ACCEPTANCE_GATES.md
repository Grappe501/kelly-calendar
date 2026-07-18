# Acceptance Gates

**Kelly Campaign Command Calendar (KCCC)**  
Version: **1.0.0**

Every step must pass its gate before starting the next step.

---

## Universal gates (all steps)

| Gate | Criteria |
|------|----------|
| **G-H** | H: preflight — TEMP under `H:\SOSWebsite\.local\temp\kelly-calendar` |
| **G-SEC** | No secrets in git diff or chat logs |
| **G-LANE** | No edits outside `kelly-calendar/` without approved integration |
| **G-GIT** | Committed and pushed to `origin/main` |
| **G-DOC** | README step indicator updated |

---

## Step 1 — Master Product Constitution ✅

| Gate | Criteria | Status |
|------|----------|--------|
| S1-A | `docs/MASTER_PRODUCT_CONSTITUTION.md` complete | ✅ |
| S1-B | `docs/H_DRIVE_FOREVER_PROTOCOL.md` complete | ✅ |
| S1-C | `docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md` complete | ✅ |
| S1-D | `docs/ARCHITECTURE_RULES.md` complete | ✅ |
| S1-E | `docs/ENVIRONMENT_PROTOCOL.md` complete | ✅ |
| S1-F | `docs/GITHUB_NETLIFY_PROTOCOL.md` complete | ✅ |
| S1-G | `docs/CURSOR_BUILD_INSTRUCTIONS.md` complete | ✅ |
| S1-H | `scripts/run-with-h-drive-env.cjs` present | ✅ |
| S1-I | `.npmrc` points cache to H: | ✅ |
| S1-J | Pushed to GitHub | ✅ (`7feb928`, refined in later Step 1 polish) |

---

## Step 2 — Application Scaffold ✅

| Gate | Criteria | Status |
|------|----------|--------|
| S2-A | `package.json` with wrapped npm scripts | ✅ |
| S2-B | Next.js App Router boots on `npm run dev` | ✅ |
| S2-C | `npm run typecheck` exit 0 | ✅ |
| S2-D | `npm run build` exit 0 | ✅ |
| S2-E | `netlify.toml` + Next plugin configured | ✅ |
| S2-F | `GET /api/health` returns 200 | ✅ |
| S2-G | `.env.example` documents required vars | ✅ |
| S2-H | Mobile shell + e2e pass | ✅ |
| S2-I | Read-only DB diagnose | ✅ |
| S2-J | Netlify production deploy | BLOCKED (operator) |

---

## Step 3 — Environment Layer

| Gate | Criteria |
|------|----------|
| S3-A | Validated env module fails fast on missing required vars |
| S3-B | RedDirt `.env.local` fallback works |
| S3-C | No `OPENAI_API_KEY` in client bundle (grep check) |
| S3-D | Startup diagnostics page or CLI (`npm run env:check`) |

---

## Step 4 — Authentication ✅

| Gate | Criteria | Status |
|------|----------|--------|
| S4-A | Login flow completes | ✅ app session cookie via `/api/auth/login` |
| S4-B | Unauthenticated users cannot reach app routes | ✅ middleware redirect / 401 |
| S4-C | Role enum enforced server-side | ✅ `SystemRole` + session |
| S4-D | Kelly role has full access | ✅ ADMINISTER via `roleHasFullCalendarAccess` |

---

## Step 5 — Data Foundation

| Gate | Criteria |
|------|----------|
| S5-A | Prisma schema uses `kelly_calendar` namespace |
| S5-B | Migrations apply cleanly |
| S5-C | Seed creates sample events (no real PII) |
| S5-D | Audit fields on mutable tables |

---

## Step 6 — Mobile Shell

| Gate | Criteria |
|------|----------|
| S6-A | Bottom nav renders at 375px |
| S6-B | Touch targets ≥ 44px |
| S6-C | Loading and error boundaries present |
| S6-D | Lighthouse mobile accessibility ≥ 90 (target) |

---

## Step 7 — Event CRUD

| Gate | Criteria |
|------|----------|
| S7-A | Create, read, update event (no delete — soft cancel) |
| S7-B | Validation on required fields |
| S7-C | Change log entry on every mutation |

---

## Step 8 — Today Command Center

| Gate | Criteria |
|------|----------|
| S8-A | Shows next event with leave-by time |
| S8-B | Shows prep checklist status |
| S8-C | Shows remainder of day timeline |
| S8-D | Empty state when no events |

---

## Step 9 — Day / Hourly

| Gate | Criteria |
|------|----------|
| S9-A | Hourly timeline renders travel + event blocks |
| S9-B | Buffer blocks visible and editable |

---

## Step 10 — Week / Month / Campaign Year

| Gate | Criteria |
|------|----------|
| S10-A | All three views functional |
| S10-B | Campaign year spans today → 2026-11-03 |
| S10-C | Election countdown displayed |

**Major checkpoint:** Working calendar without AI.

---

## Steps 11–15 — Event Intelligence

Each step gate: feature works on mobile, data persists, audit log updated, no AI auto-apply.

---

## Steps 16–20 — AI Director

| Gate | Criteria |
|------|----------|
| S16+ | AI output is always `draft` until user approves |
| S16+ | Structured JSON validates against Zod schema |
| S16+ | Conflicts detected match manual schedule rules |
| S18+ | Briefings cite only confirmed fields |

**Major checkpoint:** AI-assisted with human approval.

---

## Steps 21–25 — Operations

| Gate | Criteria |
|------|----------|
| S21 | Push notification test on Netlify |
| S22 | PWA installable; offline shows cached Today |
| S23 | ICS import creates draft events |
| S24 | County coverage dashboard accurate |
| S25 | Security checklist signed; module API doc published |

---

## Failure protocol

1. First test failure → fix and retry once
2. Same test fails twice → **stop**, report to Steve
3. Secrets detected → **stop**, do not commit
4. H: preflight fail → **stop**, fix wrapper before continuing

---

## Version history

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-07-17 | Initial gates through Step 25 outline |
