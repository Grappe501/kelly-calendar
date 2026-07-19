# Google Routes Mileage Runbook

**Truth type generated:** `GOOGLE_ROUTE_ESTIMATE` only  

## Production state (2026-07-19)

```text
Netlify Routes variables ........ SET
Production redeploy ............. TRIGGERED (build 6a5d4dcade48f1eab003ae6c)
Routes credential validity ...... NOT YET PROVEN
Doctor request validity ......... REMEDIATED (latLng ping body)
Open Mission hotfix ............. DEPLOYMENT PENDING (same redeploy)
```

### Live doctor classification (local)

Do **not** treat bare `HTTP 400` / `INVALID_ARGUMENT` as proof the key is bad. Prefer:

1. Valid doctor request (`origin`/`destination` latLng, `travelMode: DRIVE`, field mask).
2. Then classify:
   - `REQUEST_OR_ARGUMENT` — fix request first
   - `CREDENTIAL_OR_PERMISSION` (`403` / `PERMISSION_DENIED`) — credential/ACL path
   - `CREDENTIAL_KEY_EXPLICIT` — only when sanitized Google message explicitly says the API key is not valid

After the latLng doctor hotfix (2026-07-19), the live ping still failed with `HTTP 400` / `INVALID_ARGUMENT` and failure class `CREDENTIAL_KEY_EXPLICIT` (sanitized message explicitly indicated an invalid API key). Key rotation was **not** performed in that pass — operator hold.

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
