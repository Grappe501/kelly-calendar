# Google Routes Mileage Runbook

**Truth type generated:** `GOOGLE_ROUTE_ESTIMATE` only  

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

## Exclusions

- Cancelled events
- Virtual-only meetings (no physical location)
- Unresolved locations

## Future blocked

`KCCC-GOOGLE-TIMELINE-IMPORT-1.0` — voluntary `location-history.json` export only. Not implemented here.
