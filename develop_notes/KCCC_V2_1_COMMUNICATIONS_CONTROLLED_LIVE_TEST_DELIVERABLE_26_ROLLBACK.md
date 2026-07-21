# D26 Rollback — Controlled Live-Test Foundation

## Immediate safe stop

1. Revoke all `CommunicationLiveTestAuthorization` rows with status `AUTHORIZED` (`REVOKED`).
2. Set provider program states back to `SANDBOX_ONLY` or `DISABLED` (never leave `LIVE_TEST_READY` unattended).
3. Confirm global / channel / provider communications kill switches remain **ON**.
4. Hide or disable `/system/communications/live-tests` nav if operators must not launch.
5. Confirm no scheduled live-test route exists (D26 has none).
6. Confirm D25 production campaign mode remains blocked; D22 production gates closed.

## Preserve

- Provider submission evidence (if any)
- Webhook receipts and signature verification evidence
- Suppression and consent updates
- Live-test executions, evidence, post-test safety rows, incidents, post reviews

## Do not

- Rewrite a submitted/accepted message as unsent
- Delete delivery or webhook evidence to “clean up”
- Open general production dispatch as part of rollback
- Reuse a consumed authorization

## Uncertain provider outcomes

If a prior attempt left provider outcome unknown: keep authorization consumed, open an incident (`UNKNOWN_PROVIDER_OUTCOME`), and require a **new** readiness review + new one-time authorization before any further attempt. Never automatic retry.

## Schema

Migration `20260721140000_v21_communications_controlled_live_test` is additive. Drop tables only after evidence export and explicit approval.

## Validation after rollback

```bash
npm run missions:v21:communications-live-test:validate
npm run missions:v21:communications-campaign:validate
```

Confirm:

- Active live-test authorizations: 0  
- General production dispatch enabled: false  
- D25 sandbox campaigns still operate  
- Scheduled live execution: none  
