# KCCC V2.1 — Communications production enablement checklist

**Scope:** Authorization to unblock live dispatch (post-D22)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`

## Critical notice

**D22 does NOT enable production.** Sandbox integration and certification may be complete while every item below remains unchecked.

Until **all** gates are true: **`DISPATCH BLOCKED`** — preflight will report blocking reason codes and batches remain `BLOCKED` or fail preflight.

## Gates (all required)

### Provider & credentials

- [ ] Production provider selected (`KCCC_COMMUNICATIONS_PROVIDER_KEY` set to authorized vendor)
- [ ] Adapter passes **sandbox certification checklist** on target vendor
- [ ] Production API credentials verified (`verifyConnection` → `VERIFIED` in **PRODUCTION** mode)
- [ ] Sender/domain verification complete for production from-address
- [ ] Webhook URL registered with vendor (HTTPS production host)
- [ ] Webhook signing secret in env (`KCCC_*_WEBHOOK_SECRET`) — rotated from sandbox if separate

### Application controls

- [ ] `CommunicationProviderConnection.applicationDispatchEnabled` explicitly **true** (leadership action)
- [ ] Connection `mode` set to **PRODUCTION** (not sandbox)
- [ ] D20 policy `externalDispatchEnabled` **true** with documented leadership approval
- [ ] Kill switches explicitly **OFF** with audited reason string:
  - [ ] Global kill switch OFF
  - [ ] Email kill switch OFF (if sending email)
  - [ ] SMS kill switch OFF (if sending SMS)

### Operational readiness

- [ ] D20 workflow validated: content + audience + **dispatch** approvals on pilot communication
- [ ] Bounded batch drill (≤25) completed in production with **explicit** pilot recipients
- [ ] Webhook delivery/bounce/complaint path verified in production (not sandbox replay only)
- [ ] Unknown-outcome reconciliation procedure exercised
- [ ] Operator runbooks reviewed:
  - `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md`
  - `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_VALIDATION_GUIDE.md`
  - `KCCC_V2_1_COMMUNICATIONS_PROVIDER_DISASTER_RECOVERY_GUIDE.md`
- [ ] Rollback acknowledged (`DELIVERABLE_22_ROLLBACK.md` + D21 rollback)
- [ ] Legal/compliance sign-off for channel, purpose, and consent model

### Engineering validation

- [ ] `npm run missions:v21:communications-dispatch:validate` passes on release commit
- [ ] `npm run missions:v21:communications-provider:validate` passes
- [ ] `npm run typecheck` passes
- [ ] No secrets in repo or migration artifacts

## Explicit non-goals (still excluded after enablement)

- Auto-send on queue prepare/approval
- Unbounded background queue drain
- Consent inference from RSVP/attendance/Mobilize
- Mobilize as email/SMS provider

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Campaign leadership | | | Authorizes kill-switch OFF |
| Engineering | | | Cert + validation complete |
| Compliance (if applicable) | | | |

## After enablement

1. Pilot single bounded batch; monitor webhook health dashboard
2. Keep disaster recovery contacts current
3. Schedule credential rotation calendar

## If any gate fails

Leave dispatch blocked. Do not partially enable (e.g., kill switch OFF without policy gate). Fail closed.

## Related

- `KCCC_V2_1_COMMUNICATIONS_SANDBOX_CERTIFICATION_CHECKLIST.md` (prerequisite, not substitute)
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_SELECTION_GUIDE.md`
