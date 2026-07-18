# H: Drive Forever Protocol

**Kelly Campaign Command Calendar — mandatory local development standard**

Version: **1.0.0**  
Effective: **2026-07-17**  
Scope: All humans, Cursor agents, Codex sessions, and scripts working in `H:\SOSWebsite\kelly-calendar\`

---

## Purpose

The `C:\` system drive is full. Every Kelly Calendar build pass must keep **all controllable artifacts on `H:\`**. This document is the permanent protocol — not a one-time workaround.

---

## Absolute rules

| Rule | Requirement |
|------|-------------|
| **H1** | Project root is `H:\SOSWebsite\kelly-calendar\` |
| **H2** | Run `npm install`, `npm run build`, `npx`, `tsx`, and Prisma only from the lane root, wrapped with `node scripts/run-with-h-drive-env.cjs` |
| **H3** | npm cache → `H:\SOSWebsite\.cache\npm` (via `.npmrc` + wrapper) |
| **H4** | Temp / Playwright / Next / Prisma caches → `H:\SOSWebsite\.cache\` subfolders |
| **H5** | Never change global npm or git config to redirect caches to `C:\` |
| **H6** | Never create large scratch files under `C:\Users\User\AppData\Local\Temp` when an H: path exists |
| **H7** | `node_modules`, `.next`, test output, and Playwright artifacts live inside the lane on H: |
| **H8** | Do not run lane commands from `C:\` working directories |

---

## Directory map (H: only)

```text
H:\SOSWebsite\
├── .cache\
│   ├── npm\                    ← npm cache
│   ├── temp\                   ← TEMP/TMP
│   ├── playwright\             ← browser binaries
│   ├── next\
│   └── prisma\
├── kelly-calendar\             ← THIS APPLICATION
│   ├── node_modules\
│   ├── .next\
│   ├── prisma\
│   └── scripts\
│       └── run-with-h-drive-env.cjs
└── RedDirt\                    ← env fallback only (see ENVIRONMENT_PROTOCOL)
```

---

## Command wrapper

**Always** prefix toolchain commands:

```powershell
cd H:\SOSWebsite\kelly-calendar
node scripts/run-with-h-drive-env.cjs npm install
node scripts/run-with-h-drive-env.cjs npm run dev
node scripts/run-with-h-drive-env.cjs npm run typecheck
node scripts/run-with-h-drive-env.cjs npx prisma migrate dev
```

Package.json scripts (Step 2+) should call the wrapper internally so Steve and agents cannot accidentally bypass it.

---

## What may still touch C: (not agent-controlled)

These are **exceptions** — we document them honestly but do not expand them:

| Location | Why |
|----------|-----|
| `C:\Users\User\.cursor\projects\...` | Cursor IDE metadata |
| `C:\Program Files\nodejs\` | Node binary (read-only) |
| Windows system directories | OS behavior |

Agents must **not** add new C: write paths (logs, caches, downloads, test fixtures).

---

## CI and Netlify

Cloud builds run on Linux with platform-managed temp. The wrapper detects `NETLIFY`, `NETLIFY_BUILD_BASE`, or `CI` and **does not** pin H: paths in those environments.

Local Windows development always uses H:.

---

## Preflight check (run before every install/build)

```powershell
cd H:\SOSWebsite\kelly-calendar
node scripts/run-with-h-drive-env.cjs node -e "console.log('TEMP='+process.env.TEMP); console.log('npm cache='+process.env.npm_config_cache)"
```

**Pass criteria:**

- `TEMP` contains `H:\SOSWebsite\.cache\temp`
- `npm_config_cache` contains `H:\SOSWebsite\.cache\npm` (or `.npmrc` equivalent)

---

## Cleanup (when disk is tight)

Safe to delete when no build is running:

```text
H:\SOSWebsite\kelly-calendar\.next\
H:\SOSWebsite\.cache\temp\
```

Shared cache (affects all lanes):

```text
H:\SOSWebsite\.cache\npm\
```

After Step 2 scaffold: `node scripts/run-with-h-drive-env.cjs npm run build:clean` (when script exists).

---

## Agent stop conditions

Stop and report to Steve if:

1. Preflight shows temp or cache on `C:\`
2. `npm install` creates cache outside H:
3. A fix would require writing build artifacts to `C:\`
4. Secrets appear in staged files or terminal output

---

## Relationship to SOSWebsite rules

This lane extends the workspace rule in `H:\SOSWebsite\.cursor\rules\h-drive-toolchain.mdc` with **kelly-calendar-specific** temp isolation and independent git/deploy boundaries.

RedDirt remains the env-variable **source of truth** for shared secrets — not a code dependency.

---

## Version history

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-07-17 | Initial forever protocol for KCCC Step 1 |
