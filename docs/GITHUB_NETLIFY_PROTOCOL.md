# GitHub and Netlify Protocol

**Kelly Campaign Command Calendar (KCCC)**  
Version: **1.0.0**

---

## Repository

| Item | Value |
|------|-------|
| **Remote** | `https://github.com/Grappe501/kelly-calendar.git` |
| **Default branch** | `main` |
| **Local path** | `H:\SOSWebsite\kelly-calendar\` |
| **Git root** | This folder only — not parent `SOSWebsite` |

---

## Commit-after-every-pass rule

Steve and all AI agents **commit and push after every completed interaction** so Netlify (once connected) shows incremental progress.

### Pass definition

One pass = one logical step completion (e.g., Step 1 docs, Step 2 scaffold, Step 8 Today view).

### Before commit

1. `git status` — confirm scope is lane-only
2. `git diff` — **stop** if secrets (`.env`, keys, tokens) would be staged
3. Run applicable checks:
   - Step 1: doc review only
   - Step 2+: `node scripts/run-with-h-drive-env.cjs npm run typecheck`
   - Step 5+: migrations via wrapped npm script
4. H: preflight per `H_DRIVE_FOREVER_PROTOCOL.md`

### Commit message format

```text
kccc(step-N): short why-focused summary

Optional body: acceptance gates passed, commands run.
```

Examples:

```text
kccc(step-1): ratify master product constitution and H-drive protocol

kccc(step-2): scaffold Next.js PWA shell with Netlify config
```

### Push

```powershell
cd H:\SOSWebsite\kelly-calendar
git add -A
git commit -m "kccc(step-1): ratify master product constitution and H-drive protocol"
git push -u origin main
```

Never `--no-verify` unless Steve explicitly requests.

---

## Initial repository setup (once)

```powershell
cd H:\SOSWebsite\kelly-calendar
git init
git branch -M main
git remote add origin https://github.com/Grappe501/kelly-calendar.git
git add -A
git commit -m "kccc(step-1): ratify master product constitution and H-drive protocol"
git push -u origin main
```

---

## Netlify deployment (Steve configures after first push)

### New site from Git

1. Netlify → Add new site → Import from GitHub
2. Repository: `Grappe501/kelly-calendar`
3. Branch: `main`
4. Base directory: *(empty — repo root is the app)*
5. Build command: `npm run build` *(or `node scripts/run-with-h-drive-env.cjs npm run build` if package.json wraps it)*
6. Publish directory: `.next` for Next.js on Netlify — use `@netlify/plugin-nextjs` (Step 2)

### Environment variables

Copy from RedDirt Netlify site where shared — see `ENVIRONMENT_PROTOCOL.md`.

### Deploy previews

Every push to `main` → production deploy.  
PR branches → preview URLs (optional).

---

## Branch strategy

| Branch | Use |
|--------|-----|
| `main` | Production — always deployable |
| `feature/kccc-step-N-*` | Optional long steps; merge to main same day |

Prefer small commits directly on `main` during initial 25-step sprint.

---

## Hard stops — do not commit/push

- Secrets in staged files
- H: preflight failure
- Cross-lane file contamination
- Same test failed twice after repair attempt
- Prisma migration order conflict

Report blockers to Steve; do not force push.

---

## Pass summary template (every AI response)

```text
Active lane: kelly-calendar
Step: N — name
Files changed: (list)
Commands run: (list + exit codes)
Git: branch · commit hash · push status
H: preflight: pass/fail
Next step: N+1
```

---

## Version history

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-07-17 | Initial protocol |
