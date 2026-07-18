# Kelly Campaign Command Calendar (KCCC)

**Kelly Grappe for Arkansas — standalone campaign scheduling operating system**

| Field | Value |
|-------|-------|
| **Working name** | Kelly Campaign Command Calendar |
| **Shorthand** | KCCC |
| **Lane path** | `H:\SOSWebsite\kelly-calendar\` |
| **GitHub** | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| **Deploy target** | Netlify (separate site from RedDirt) |
| **Election anchor** | Tuesday, November 3, 2026 |

---

## What this is

Not a generic calendar with campaign colors. **Kelly’s daily operating system** — a mobile-first, AI-assisted command center that answers:

> **Where do I need to be, when do I need to leave, what do I need to know, who will be there, and what must happen next?**

---

## Start here (humans and AI)

Read in order:

1. [`docs/MASTER_PRODUCT_CONSTITUTION.md`](docs/MASTER_PRODUCT_CONSTITUTION.md) — vision, scope, AI doctrine, roles
2. [`docs/H_DRIVE_FOREVER_PROTOCOL.md`](docs/H_DRIVE_FOREVER_PROTOCOL.md) — **mandatory** local toolchain; nothing writes to `C:\`
3. [`docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md`](docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md) — phased build plan
4. [`docs/ARCHITECTURE_RULES.md`](docs/ARCHITECTURE_RULES.md) — stack, data model, integration boundaries
5. [`docs/ENVIRONMENT_PROTOCOL.md`](docs/ENVIRONMENT_PROTOCOL.md) — RedDirt env fallback, secrets, validation
6. [`docs/GITHUB_NETLIFY_PROTOCOL.md`](docs/GITHUB_NETLIFY_PROTOCOL.md) — commit-after-pass, deploy workflow
7. [`docs/ACCEPTANCE_GATES.md`](docs/ACCEPTANCE_GATES.md) — quality gates per step
8. [`docs/CURSOR_BUILD_INSTRUCTIONS.md`](docs/CURSOR_BUILD_INSTRUCTIONS.md) — agent operating manual

---

## Current build step

**Step 1 — Master Product Constitution** ✅ (ratified; constitution v1.0.1)

Next: **Step 2 — Standalone Application Scaffold** (Next.js, TypeScript, lint, tests, Netlify config)

---

## Hard rules (summary)

- All local files, caches, temp, `node_modules`, and build artifacts stay on **`H:\`**
- Separate app from RedDirt — no imports from `RedDirt/src/**`
- Shared secrets via RedDirt `.env.local` fallback — never copy into source
- `OPENAI_API_KEY` server-only — never `NEXT_PUBLIC_*`
- AI proposes; humans approve — no silent event publication
- Commit and push after every completed build pass
- No deletes of existing SOSWebsite lane files without explicit approval

---

## Commands (after Step 2 scaffold exists)

```powershell
cd H:\SOSWebsite\kelly-calendar
node scripts/run-with-h-drive-env.cjs npm install
node scripts/run-with-h-drive-env.cjs npm run dev
node scripts/run-with-h-drive-env.cjs npm run typecheck
```

---

## Lane marker

This folder is an independent product lane inside `H:\SOSWebsite`. See `_WORKSPACE_LANE_MARKER.txt`.
