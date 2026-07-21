# KCCC V2.1 — Communications provider disaster recovery guide

**Scope:** Operator response when provider or dispatch path fails  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`

## Objectives

1. Stop new outbound provider requests quickly
2. Preserve audit history (batches, attempts, webhooks)
3. Maintain D20 export/handoff path for urgent communications
4. Recover without fabricating delivery state

## Severity levels

| Level | Symptoms | Immediate action |
|-------|----------|------------------|
| **S1 — Vendor outage** | Verify fails; vendor status page incident; mass `UNKNOWN` | Kill switches ON; pause batches |
| **S2 — Webhook failure** | Sends accept but no delivery events; spike `UNMATCHED`/`REJECTED` | Keep dispatch blocked; investigate signature/URL |
| **S3 — Credential compromise** | Exposed API key | Revoke keys; unset provider key; rotation guide |
| **S4 — Kelly deploy fault** | Adapter errors after release | Rollback D22 code; env unset |

## Immediate containment (any severity)

1. **Global kill switch ON** — blocks new dispatch at preflight
2. **Channel switches ON** if isolating EMAIL vs SMS
3. Optionally **unset** `KCCC_COMMUNICATIONS_PROVIDER_KEY` → `disabled` adapter
4. Do **not** delete in-flight attempt rows — mark batches `PAUSED` or `CANCELLED` via operator UI

## During active incident

### Outbound stopped, queue intact

- D20 queue and approvals unchanged
- Operators use **export** or **manual handoff** (`DisabledCommunicationProviderAdapter` path)
- Document communications sent outside Kelly for later reconciliation

### Unknown-outcome attempts

- Do not auto-retry until vendor truth known
- Run **reconcile** per attempt when vendor API available
- If vendor confirms no send → operator may retry new batch after gates reopen

### Webhook backlog

- Vendor may replay webhooks after outage — replay dedupe prevents double suppressions
- Monitor for `DUPLICATE` vs new `PROCESSED` ratio

## Vendor failover (future)

Kelly selects **one** active provider key. Failover is **manual**:

1. Complete certification for alternate vendor (sandbox → production gates)
2. Update `KCCC_COMMUNICATIONS_PROVIDER_KEY`
3. Verify connection + webhooks on new vendor
4. Leadership sign-off on production enablement checklist
5. Do not run dual-live providers without explicit architecture approval

There is no automatic traffic split at D22.

## Recovery checklist

- [ ] Vendor status green / verify connection succeeds
- [ ] Webhook test event `VERIFIED` → `PROCESSED`
- [ ] Kill switches OFF only with documented reason (post-enablement)
- [ ] Pilot bounded batch before resuming campaign sends
- [ ] Post-incident note: root cause, duration, messages affected (counts only — no PII in ticket)

## Data preservation

| Asset | DR rule |
|-------|---------|
| `CommunicationDispatchAttempt` | Never bulk-delete |
| `CommunicationWebhookReceipt` | Retain through purge policy |
| D20 suppressions | Provider webhook imports are authoritative — do not delete during outage |
| Secrets | Rotate if any doubt of exposure |

## Communication plan

| Audience | Message |
|----------|---------|
| Campaign leadership | Dispatch blocked; export path available |
| Operators | No new batches; reconcile unknowns before retry |
| Voters/public | Use alternate channel if time-critical (manual process outside scope) |

## Rollback reference

Fastest safe state:

1. Kill switches ON
2. Unset provider env key
3. D20 export/handoff only

See `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22_ROLLBACK.md`.

## Related

- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_HEALTH_DASHBOARD_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_CREDENTIAL_ROTATION_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_PRODUCTION_ENABLEMENT_CHECKLIST.md`
