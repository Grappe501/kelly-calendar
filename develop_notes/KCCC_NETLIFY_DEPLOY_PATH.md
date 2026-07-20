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

Empty Netlify logs with Framework Unknown = prepare-repo/clone failure, **not** an app build failure. Do not chase Next.js / `netlify.toml` for that class of error.

### Production OAuth redirect (must match exactly)

```text
https://kelly-calendar.netlify.app/api/integrations/google/calendar/callback
```

Set in Google Cloud Authorized redirect URIs **and** Netlify `KCCC_GOOGLE_OAUTH_REDIRECT_URI`.

### Later repair for Netlify Git CD only

1. Disconnect the GitHub repo from the Netlify site.
2. Reauthorize/reinstall the Netlify GitHub App for `Grappe501/kelly-calendar`.
3. Reconnect repo, branch `main`.
4. Confirm HTTPS/GitHub App auth (not stale SSH).
5. One clean deploy with `preparing repo` success, then re-enable automatic builds (`stop_builds=false`).

Until then: **GitHub Actions / CLI is the authoritative production path.**
