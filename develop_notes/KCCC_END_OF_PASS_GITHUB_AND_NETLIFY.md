# KCCC — End-of-pass GitHub + Netlify (mandatory)

**Status:** ACTIVE PROTOCOL  
**Date:** 2026-07-19  

After **every** agent interaction that changes tracked files in this repo:

## 1. GitHub

1. `git status` / `git diff` — confirm scope; never stage secrets (`.env.local`, keys, tokens).
2. Stage intentional lane changes.
3. Commit with a clear why-focused message.
4. `git push -u origin HEAD` (or current tracking branch).
5. Report: **branch · commit hash · push status**.

Skip commit/push only if the working tree is clean **and** already up to date with origin.

## 2. Netlify production

After a successful push (or after env-only production changes that need a live bundle):

```powershell
cd H:\SOSWebsite\Kelly-calendar
# Stop local `next dev` first if running — file locks break publish
npm run deploy:netlify:prod
```

Report: **deploy live URL / deploy id** (or failure reason).

GitHub Actions (`.github/workflows/netlify-deploy.yml`) is a backup when runners are healthy. **CLI deploy remains the authoritative path** until Actions is proven reliable. Do not leave production stale after a docs or code pass.

## Hard stops

- Secrets in staged files → do not commit; do not deploy secrets into git.
- Same deploy failed twice after repair → stop and hand off.
- `preparing repo` / exit 128 on Netlify git CD → use CLI/Actions; do not thrash git auto-build.

## Completion format (every pass)

```text
Git: branch · commit · push
Netlify: deployed | skipped (reason) | failed (reason)
```
