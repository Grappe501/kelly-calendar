# D25 Rollback — Campaign Execution Foundation

## Immediate safe stop

1. Revoke all `CommunicationLaunchAuthorization` rows (`decision=REVOKED`).
2. Pause/cancel active `CommunicationExecutionRun` rows.
3. Unset `KCCC_SCHEDULED_EXECUTION_SECRET` (scheduled ingress fails closed).
4. Remove/hide `/system/communications/campaigns` nav if needed.
5. Confirm D21 kill switches remain ON; D22 production gates remain closed.

## Preserve

- D20–D24 tables and evidence  
- Dispatch attempts / webhook receipts  
- Consent and suppression updates  

## Do not

- Mark provider-accepted messages as unsent  
- Delete delivery evidence as part of rollback  
- Open production to “clean up”

## Schema

Migration `20260721120000_v21_communications_campaign_execution` is additive. Table drop only after evidence export and explicit approval.

## Validation after rollback

```bash
npm run missions:v21:communications-audience:validate
npm run missions:v21:communications-dispatch:validate
```
