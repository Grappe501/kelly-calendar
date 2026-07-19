# Google Routes Mileage Runbook

**Truth type generated:** `GOOGLE_ROUTE_ESTIMATE` only  

## Production state (2026-07-19)

```text
Doctor request validity ....... PROVEN
Credential failure ............ CONFIRMED (CREDENTIAL_KEY_EXPLICIT after valid latLng ping)
Key replacement ............... AUTHORIZED
Open Mission deploy ........... IN PROGRESS
Routes production readiness ... BLOCKED UNTIL NEW KEY PASSES
```

### Authorized key replacement procedure

1. Google Cloud Console (same project with Routes API enabled) → **APIs & Services → Credentials** → create API key.
2. Restrict immediately: **Routes API only**; strongest practical **server-side** application restriction for Netlify (not browser referrers).
3. Keep the old key until the new key passes local doctor.
4. Local install (hidden prompt — never paste into Cursor):

```powershell
cd H:\SOSWebsite\Kelly-calendar
npm run google:secrets:configure -- --routes-only
$env:KCCC_ROUTES_DOCTOR_PING='true'
npm run campaign:routes:doctor
```

Expected:

```text
Routes API key configured .... YES
Routes integration enabled ... YES
Routes API reachable ......... PASS
Classification ............... SUCCESS
```

5. Replace Netlify `KCCC_GOOGLE_MAPS_ROUTES_API_KEY` only; keep `KCCC_GOOGLE_ROUTES_ENABLED=true`; redeploy.
6. Revoke the old key only after local + production validation pass.

### Live doctor classification (local)

Do **not** treat bare `HTTP 400` / `INVALID_ARGUMENT` as proof the key is bad. Prefer:

1. Valid doctor request (`origin`/`destination` latLng, `travelMode: DRIVE`, field mask).
2. Then classify:
   - `REQUEST_OR_ARGUMENT` — fix request first
   - `CREDENTIAL_OR_PERMISSION` (`403` / `PERMISSION_DENIED`) — credential/ACL path
   - `CREDENTIAL_KEY_EXPLICIT` — only when sanitized Google message explicitly says the API key is not valid

Evidence trail: latLng doctor ping proven; subsequent failure class `CREDENTIAL_KEY_EXPLICIT` → key replacement authorized.

## Language

Use: estimated campaign route · estimated driving distance · Google-calculated route distance  

Never: actual mileage · miles driven · verified route · confirmed path  

## Commands

```bash
npm run campaign:routes:doctor
npm run campaign:routes:reconstruct
npm run campaign:routes:reconstruct -- --apply
npm run campaign:routes:report
```

Enable with `KCCC_GOOGLE_ROUTES_ENABLED=true` after key is set.

Live ping (never prints the key):

```bash
# PowerShell
$env:KCCC_ROUTES_DOCTOR_PING='true'
npm run campaign:routes:doctor
```

## Exclusions

- Cancelled events
- Virtual-only meetings (no physical location)
- Unresolved locations

## Future blocked

`KCCC-GOOGLE-TIMELINE-IMPORT-1.0` — voluntary `location-history.json` export only. Not implemented here.
