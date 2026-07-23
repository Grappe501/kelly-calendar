# IC-02 — RedDirt Read Integration

```text
Build ID:     KCCC-IC-02-REDDIRT-READ-INTEGRATION-1.0
ADR:          ADR-104
Status:       COMPLETE (at ship)
Migration:    20260723140000_ic02_reddirt_read_integration
Validator:    npm run intelligence:reddirt:validate
```

## Summary

Campaign-scoped, server-only, **read-only** RedDirt integration that supplies trustworthy strategic geography facts for later calendar intelligence. IC-01 remains the geographic system of record (75 counties / 250 places).

## Modes

| Mode | When |
|------|------|
| `NOT_CONFIGURED` | Missing `REDDIRT_API_KEY` / `REDDIRT_ORGANIZATION_ID` |
| `DISABLED` | `REDDIRT_READ_ENABLED` false (default) |
| `DOCUMENTATION_PENDING` | Credentials may exist but no verified official API contract |
| Fixture dry-run | Authorized test path — labeled FIXTURE, not live RedDirt |
| Approved export | Operator-initiated JSON/CSV with privacy allowlist |

## Architecture

- Feature: `src/features/reddirt-integration/`
- Service: `src/server/services/reddirt-integration-service.ts`
- Repository: `src/server/repositories/reddirt-integration-repository.ts`
- Provider: `ExternalProvider.REDDIRT`
- Models: `StrategicSourceObservation`, `StrategicGeographyFact` (+ reused `External*`)

## APIs

`/api/integrations/reddirt/` — status, verify, dry-run, runs, runs/[id], runs/[id]/apply, candidates disposition, policy, geography, capabilities, import/preview

## Pages

`/system/integrations/reddirt/` — home, runs, runs/[id], reconciliation, geography, policy

## Hard boundaries

No RedDirt writes · no OpenAI · no person import · no Event/Mission mutation · no `NEXT_PUBLIC_REDDIRT_*`

## Contract status

Official RedDirt HTTP API documentation was **not** present in-repo at inspection (2026-07-23). Adapter fails closed as `DOCUMENTATION_PENDING` and never invents endpoints. Placeholder allowlist host: `api.reddirt.example`.
