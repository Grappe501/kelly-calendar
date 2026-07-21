# KCCC EA-8 — Security Closeout Evidence

```text
Build: KCCC-EA-8-SECURITY-CLOSEOUT-1.0
Date: 2026-07-21
Status: COMPLETE
Operator authorization: Steve Grappe (roadmap acceptance + closeout directive)
```

## Success criteria (product)

```text
✓ Authentication complete (APP_SESSION_SECRET ≥ 32 → live flags)
✓ Staff login + role permissions remain enforced (existing RBAC)
✓ Public users cannot access private campaign schedules (middleware + visibility)
✓ Calendar APIs remain auth-gated (auth:routes:validate)
✓ Candidate-data ready = true when auth infrastructure ready
✓ Global warning banner suppressed when certified
✓ Status / security dashboards reflect live certified state
✓ No new calendar features added in this pass
```

## Gate flip

| Flag | Before | After |
|------|--------|-------|
| `authenticationComplete` | secret-dependent | unchanged (secret-dependent) |
| `candidateDataReady` | always false | true when auth ready |
| `candidateDataEntryAuthorized` | always false | true when auth ready |
| Runtime step | 8 / KCCC-EA-8-SECURITY | 9 / KCCC-EA-9-CANONICAL-CALENDAR-DATA-MODEL |

Source of truth: `src/lib/auth/auth-flags.ts` (`CANDIDATE_DATA_CERTIFICATION.certified = true`).

## Rollback

Set `CANDIDATE_DATA_CERTIFICATION.certified` to `false`, set `build_state.candidate_data_ready` / `real_candidate_data_enabled` to false, redeploy.

## Out of scope (held)

- Communications / LG-1 / Resend
- Step 9 schema implementation
- Landing-page Today redesign (deferred to Step 10 UX)
- New migrations

## Next authorized build

```text
KCCC-EA-9-CANONICAL-CALENDAR-DATA-MODEL-1.0
```

Do not start automatically.
