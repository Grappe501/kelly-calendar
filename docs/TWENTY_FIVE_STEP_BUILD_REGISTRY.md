# Twenty-Five Step Build Registry

**Kelly Campaign Command Calendar (KCCC)**  
Registry version: **1.0.0**

Each step is one commit-ready pass. Status updates in README after each push.

Legend: ⬜ pending · 🔄 in progress · ✅ complete

---

## Phase I — Foundation

| Step | Name | Deliverable | Status |
|------|------|-------------|--------|
| **1** | Master Product Constitution | Vision, AI doctrine, H: protocol, this registry, acceptance gates | ✅ |
| **2** | Standalone Application Scaffold | Next.js + TS + lint + test + Git + Netlify config | ⬜ |
| **3** | Environment and Security Layer | Validated env loader, RedDirt fallback, startup diagnostics | ⬜ |
| **4** | Authentication and Roles | Secure login, Kelly RBAC | ⬜ |
| **5** | Calendar Data Foundation | Prisma schema `kelly_calendar`, migrations, seed, audit fields | ⬜ |

---

## Phase II — Working Calendar

| Step | Name | Deliverable | Status |
|------|------|-------------|--------|
| **6** | Mobile Application Shell | Bottom nav, headers, responsive layout, a11y base | ⬜ |
| **7** | Event Creation and Editing | Manual CRUD (before AI) | ⬜ |
| **8** | Today Command Center | Kelly's Day — next event, leave-by, prep | ⬜ |
| **9** | Day and Hourly Timeline | Travel, prep, buffer blocks | ⬜ |
| **10** | Week, Month, Campaign-Year Views | All major modes + election countdown | ⬜ |

**Checkpoint:** Usable calendar without AI.

---

## Phase III — Rich Event Intelligence

| Step | Name | Deliverable | Status |
|------|------|-------------|--------|
| **11** | Event Command Page | Full drill-down sections | ⬜ |
| **12** | People, Organizations, Locations | Reusable records + event links | ⬜ |
| **13** | Tasks, Assignments, Checklists | Before / during / after workflows | ⬜ |
| **14** | Files, Photos, Notes | Attachments and internal notes | ⬜ |
| **15** | Travel and Departure Intelligence | Maps links, departure calc, segments | ⬜ |

---

## Phase IV — AI Calendar Director

| Step | Name | Deliverable | Status |
|------|------|-------------|--------|
| **16** | AI Event Creation | Typed NL → structured proposal → approve | ⬜ |
| **17** | Voice Event Creation | Speech capture + review workflow | ⬜ |
| **18** | AI Conflict Analysis | Overlap, travel, missing data detection | ⬜ |
| **19** | Daily and Event Briefings | Evidence-grounded candidate briefings | ⬜ |
| **20** | AI Search and Conversation | NL calendar Q&A | ⬜ |

**Checkpoint:** AI-assisted scheduling with human approval.

---

## Phase V — Candidate-Grade Operations

| Step | Name | Deliverable | Status |
|------|------|-------------|--------|
| **21** | Notifications and Reminders | Push, departure warnings, follow-ups | ⬜ |
| **22** | PWA Install and Offline | Manifest, service worker, IndexedDB sync | ⬜ |
| **23** | External Calendar Import/Export | ICS first, then controlled sync | ⬜ |
| **24** | Campaign Intelligence Dashboard | County coverage, prep health, travel load | ⬜ |
| **25** | Launch Certification | Security/a11y/AI audits, module API, v2 roadmap | ⬜ |

---

## Step detail — Step 1 ✅

**Files created:**

- `README.md`
- `_WORKSPACE_LANE_MARKER.txt`
- `.gitignore`, `.npmrc`
- `scripts/run-with-h-drive-env.cjs`
- `docs/MASTER_PRODUCT_CONSTITUTION.md`
- `docs/H_DRIVE_FOREVER_PROTOCOL.md`
- `docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md` (this file)
- `docs/ARCHITECTURE_RULES.md`
- `docs/ENVIRONMENT_PROTOCOL.md`
- `docs/GITHUB_NETLIFY_PROTOCOL.md`
- `docs/ACCEPTANCE_GATES.md`
- `docs/CURSOR_BUILD_INSTRUCTIONS.md`

**Acceptance:** All Step 1 gates in `ACCEPTANCE_GATES.md` pass; pushed to GitHub.

---

## Step detail — Step 2 (next)

**Create:**

```text
kelly-calendar/
├── package.json          (scripts wrap run-with-h-drive-env.cjs)
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── vitest.config.ts
├── netlify.toml
├── public/manifest.json  (stub)
└── src/app/              (minimal layout + health route)
```

**Commands:**

```powershell
cd H:\SOSWebsite\kelly-calendar
node scripts/run-with-h-drive-env.cjs npm install
node scripts/run-with-h-drive-env.cjs npm run typecheck
node scripts/run-with-h-drive-env.cjs npm run build
```

**Acceptance:** Build green; H: preflight pass; Netlify config present.

---

## Compression guidance

Steps 6–10 can ship incrementally to Netlify — Kelly gets value after Step 8 (Today view).

Steps 16–20 should not start until Step 7 manual CRUD is stable.

Days 4–7 RedDirt work continues in parallel lane — no code imports between lanes.

---

## Version history

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-07-17 | Initial registry with Step 1 complete |
