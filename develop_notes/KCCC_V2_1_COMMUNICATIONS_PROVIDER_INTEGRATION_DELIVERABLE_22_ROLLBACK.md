# D22 Rollback — Communications Provider Selection & Sandbox Integration

**Companion:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`

## Immediate disable (no deploy required)

1. **Unset provider env keys** in Netlify (or local `.env.local` — never commit):
   - Clear `KCCC_COMMUNICATIONS_PROVIDER_KEY` (or set to empty) → active adapter returns to `disabled`
   - Optionally remove `KCCC_RESEND_API_KEY` and `KCCC_RESEND_WEBHOOK_SECRET` to prevent accidental re-enable
2. **Confirm kill switches ON** via dispatch controls (defaults remain blocking if untouched):
   - `globalKillSwitch: true`
   - `emailKillSwitch: true`
   - `smsKillSwitch: true`
3. **Leave `applicationDispatchEnabled: false`** on all `CommunicationProviderConnection` rows — do not enable during rollback investigation.

Active adapter resolves to `disabled` within next serverless cold start after env change. No in-flight sandbox sends should exist at D22 ship; if a drill was running, wait for batch completion or mark batch `CANCELLED` via operator UI.

## Code rollback (if reverting D22 commit)

1. Disable dispatch mutations first (env unset + kill switches ON).
2. Revert D22 feature commit; redeploy.
3. Confirm registry no longer exposes `resend` / `kccc-sandbox` if revert removes them.
4. Confirm webhook route returns 404 for removed provider keys.
5. Re-run `npm run missions:v21:communications-dispatch:validate` — D21 suite must pass.

## Migration rollback (exceptional)

D22 may add columns or indexes on D21 tables (e.g., extended capability snapshots). **Do not** drop tables routinely.

Revert migration only when:

- D22-specific columns unused and zero dependent audit rows, **or**
- Full DB backup taken and Steve authorized schema rollback

Expected at greenfield ship: D21 tables empty or sandbox-only rows — **no data loss expected for empty tables**.

| Table | Rollback impact |
|-------|-----------------|
| `CommunicationProviderConnection` | Preserve rows; set mode `DISABLED` if reverting adapter code |
| `CommunicationDispatchControl` | Preserve; keep kill switches ON |
| `CommunicationDispatchBatch` | Preserve audit history |
| `CommunicationDispatchAttempt` | Preserve; do not delete |
| `CommunicationWebhookReceipt` | Preserve for compliance window |

## Kill switches as permanent safety net

Even if env keys are mis-set, kill switches ON block dispatch at preflight (`GLOBAL_KILL_SWITCH`, channel switches). Rollback procedure always includes verifying switches before closing incident.

## Webhook endpoint

After rollback, unregister or pause Resend sandbox webhook URL in vendor console to stop inbound traffic. Unsigned or unknown-provider requests already fail closed (404/401).

## Do not

- Bulk-delete dispatch or webhook rows during rollback
- Fabricate delivery events to close batches
- Enable production keys “to test rollback”
- Store rollback secrets in repo or tickets
- Force-push `main` without approval
- Drop D20 comms, consent, or suppression tables

## Restore prior state (D21-only)

1. Unset `KCCC_COMMUNICATIONS_PROVIDER_KEY`
2. Kill switches ON
3. D20 export/handoff unchanged via `DisabledCommunicationProviderAdapter`
4. Operator path: queue → export/manual handoff only

## Principle

Disable env selection and provider requests; preserve audit history. Rollback must not imply messages were delivered or erase sandbox certification evidence without authorization.
