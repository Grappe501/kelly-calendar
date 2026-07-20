# KCCC Netlify deploy path

**Date:** 2026-07-19  

## Problem

Netlify continuous deployment failed at **preparing repo**:

```text
Host key verification failed
fatal: Could not read from remote repository
exit status 128
```

This is a Netlify ↔ GitHub clone permission/host-key failure, not an app build error.

## Fix (durable)

1. **Stopped** Netlify git auto-builds (`stop_builds=true`) so broken clone attempts stop failing.
2. **GitHub Actions** deploys on every `main` push: `.github/workflows/netlify-deploy.yml`
   - Secrets: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`
   - Command: `netlify deploy --build --prod` (builds on GitHub; no Netlify git clone)
3. **Emergency local deploy** (when Actions runners are unavailable):

```powershell
# Stop local next dev first — file locks on .next break @netlify/plugin-nextjs publish
cd H:\SOSWebsite\Kelly-calendar
npm run deploy:netlify:prod
```

## Operator note

If GitHub Actions shows `startup_failure`, that is a GitHub runner/platform fault. Retry `workflow_dispatch` or use `npm run deploy:netlify:prod` after stopping `next dev`.

To restore Netlify-native git CD later: relink the repo in Netlify UI, then set `stop_builds=false`.
