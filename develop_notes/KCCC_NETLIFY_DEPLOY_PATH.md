# KCCC Netlify deploy path

**Date:** 2026-07-19  

**Mandatory protocol:** After every interaction that changes files → commit/push GitHub **and** deploy Netlify. See `KCCC_END_OF_PASS_GITHUB_AND_NETLIFY.md`.

## Problem

Netlify continuous deployment failed at **preparing repo**:

```text
Host key verification failed
fatal: Could not read from remote repository
exit status 128
```

This is a Netlify ↔ GitHub clone permission/host-key failure, not an app build error.

## Fix (durable)

1. Temporarily stopped Netlify git auto-builds during the `exit 128` / host-key clone outage (noise control only). **Git auto-builds are ACTIVE again** as of 2026-07-19 evening.
2. **GitHub Actions** remains a backup path on every `main` push: `.github/workflows/netlify-deploy.yml`
   - Secrets: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`
   - Command: `netlify deploy --build --prod` (builds on GitHub; no Netlify git clone)
3. **Emergency local deploy** (when Netlify git or Actions is unavailable):

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
