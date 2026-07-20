# D17 Rollback — Mobilize Event Publishing

## Immediate (non-destructive)

1. Ensure `MOBILIZE_PUBLISHING_ENABLED`, `MOBILIZE_UPDATES_ENABLED`, and `MOBILIZE_DELETE_ENABLED` are unset/false.
2. Leave `MOBILIZE_API_KEY` unset to restore full `NOT_CONFIGURED` network behavior.
3. D16 dry-run / verify routes remain usable.

## Preserve

- `ExternalPublication`, approvals, attempts, and audit history
- `ExternalObjectReference` rows already linked from successful publishes
- Local Events and Missions (never auto-deleted)

## In-flight / unknown outcome

1. Do not blind-retry CREATE.
2. Operator must refresh remote state / reconcile before any new create attempt.
3. Mark attempts `UNKNOWN_OUTCOME` remain operator-reviewed.

## Code rollback

1. Revert D17 feature commit(s) on `main` or redeploy prior Netlify deploy (D16 `6a5e679557a9567df786f5e0` / commit `db1a826`).
2. Do **not** claim remote Mobilize events were reverted — remote objects are not deleted by rollback.
3. Database rollback of D17 tables only when safe and unused; prefer leaving additive tables in place.

## Never automate

Destructive remote deletion as part of rollback.
