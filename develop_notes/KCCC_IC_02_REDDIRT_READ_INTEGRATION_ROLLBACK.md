# IC-02 RedDirt Read Integration — Rollback

```text
Build:     KCCC-IC-02-REDDIRT-READ-INTEGRATION-1.0
ADR:       ADR-104
Migration: 20260723140000_ic02_reddirt_read_integration
```

## Safe rollback posture (preferred)

1. Set `REDDIRT_READ_ENABLED=false` (or unset) — network remains off.
2. Remove `REDDIRT_API_KEY` / `REDDIRT_ORGANIZATION_ID` from env if needed.
3. Leave applied `StrategicGeographyFact` rows in place for audit (do not hard-delete without Steve approval).
4. Hide UI links if a hotfix is required; do not drop enums used by historical rows without a follow-up ADR.

## Schema rollback (only if approved)

Additive migration. Reversing requires dropping:

- `StrategicGeographyFact`
- `StrategicSourceObservation`
- enum values `REDDIRT`, `GEOGRAPHY_COUNTY`, `GEOGRAPHY_PLACE`, `STRATEGIC_FACT` (Postgres enum value removal is non-trivial — prefer leave unused)

Do **not** delete IC-01 geography tables or rows.

## Constants

Under a new ADR only: set `IC_02_STATUS` away from COMPLETE; do not silently reopen IC-03.

## What rollback must never do

- Mutate Events or Missions to “undo” RedDirt context
- Delete ArkansasCounty / GeographyPlaceAuthority
- Probe RedDirt write endpoints
- Invent credentials
