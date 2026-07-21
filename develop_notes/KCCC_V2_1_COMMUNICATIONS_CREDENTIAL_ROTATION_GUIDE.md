# KCCC V2.1 — Communications credential rotation guide

**Scope:** D22 provider secrets management  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`

## Policy

| Rule | Detail |
|------|--------|
| **Env only** | All provider credentials live in Netlify (or secure host env) — never commit, chat, or screenshot |
| **Never DB** | `CommunicationProviderConnection` stores capability snapshots and verify timestamps — **not** secrets |
| **Never client** | Browser and API responses must not return key material |
| **Rotation on compromise** | Rotate immediately if key exposed; assume webhook secret burned too |

## Resend (D22 official adapter)

| Variable | Purpose |
|----------|---------|
| `KCCC_RESEND_API_KEY` | Outbound API authentication |
| `KCCC_RESEND_WEBHOOK_SECRET` | Inbound webhook signature verification |

Supporting:

| Variable | Purpose |
|----------|---------|
| `KCCC_COMMUNICATIONS_PROVIDER_KEY` | Active adapter slug (`resend` when using Resend) |

## Rotation procedure — API key

1. **Generate new key** in Resend dashboard (sandbox key during D22; production key only after enablement).
2. **Netlify** → Site settings → Environment variables:
   - Add new `KCCC_RESEND_API_KEY` value
   - Keep old key active in vendor console until verify passes (if vendor supports dual keys; otherwise brief overlap window)
3. **Deploy** or trigger rebuild so serverless functions pick up env (no code change required).
4. **Verify connection** from provider dashboard — expect `VERIFIED`.
5. **Revoke old key** in Resend dashboard after verify succeeds.
6. **Document** rotation date and operator in internal run log (no secret values).

## Rotation procedure — webhook secret

1. **Generate new signing secret** in Resend webhook settings.
2. Update `KCCC_RESEND_WEBHOOK_SECRET` in Netlify.
3. Redeploy / wait for env propagation.
4. **Send test webhook** from vendor (or replay sandbox event) — confirm not `REJECTED`.
5. Update vendor webhook configuration if URL or secret binding requires re-save.
6. Revoke prior secret in vendor console.

## During rotation (dispatch still blocked at D22)

- Kill switches remain **ON** — rotation does not enable dispatch
- `applicationDispatchEnabled` remains **false**
- In-flight sandbox drills may fail briefly — pause certification until verify green

## Failure modes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Verify fails | Wrong key, typo, sandbox vs prod key mix-up | Re-copy from vendor; check variable name |
| Webhooks all `REJECTED` | Secret mismatch or clock skew | Rotate webhook secret; check tolerance |
| Intermittent 401 | Partial deploy / stale function | Redeploy; confirm all contexts updated |

## Adding a future vendor

Document new env vars in adapter development guide and comparison matrix:

- `KCCC_{VENDOR}_API_KEY`
- `KCCC_{VENDOR}_WEBHOOK_SECRET`

Follow same rotation pattern — never add columns for secrets.

## Emergency — suspected leak

1. Revoke keys in vendor console **immediately**
2. Unset `KCCC_COMMUNICATIONS_PROVIDER_KEY` → `disabled`
3. Kill switches **ON**
4. Issue new keys; complete rotation procedure
5. Review webhook receipts for anomalous `VERIFIED` volume during exposure window

## Related

- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22_ROLLBACK.md`
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_HEALTH_DASHBOARD_GUIDE.md`
