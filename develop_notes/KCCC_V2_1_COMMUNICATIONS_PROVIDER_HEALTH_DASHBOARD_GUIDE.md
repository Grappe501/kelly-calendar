# KCCC V2.1 — Communications provider health dashboard guide

**Scope:** D22 provider health monitoring (read-only operational view)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`  
**UI:** `/system/communications/providers` (leadership only)

## Purpose

Give campaign leadership a **single pane** for adapter selection state, connection health, capability flags, and dispatch gate status — without exposing secrets or implying production is enabled.

## Access

- Requires system admin / campaign leadership role (same as D21 dispatch admin)
- Triggers `ensureDefaultDispatchControl` on intentional load only (kill-switch row creation)

## Dashboard sections

### Active provider

| Field | Healthy | Investigate |
|-------|---------|-------------|
| Selected key (`KCCC_COMMUNICATIONS_PROVIDER_KEY`) | Expected sandbox key (e.g. `resend`) or unset | Unexpected production vendor without enablement |
| Active adapter | Matches registered key | Mismatch → env typo; falls back to `disabled` |
| Mode | `SANDBOX` for D22 | `PRODUCTION` before enablement checklist |

### Connection health

Per `CommunicationProviderConnection`:

| Signal | Meaning |
|--------|---------|
| `configurationState: VERIFIED` | Last verify succeeded |
| `configurationState: DEGRADED` | Credentials present but verify failing intermittently |
| `configurationState: PARTIAL` | Missing env or sender not verified |
| `verifiedAt` | Stale > 7 days → re-run verify after credential rotation |
| `applicationDispatchEnabled: false` | **Expected at D22 ship** |

### Capability snapshot

From `discoverCapabilities()` — flags such as:

- `ADAPTER_IMPLEMENTED`, `CREDENTIALS_VERIFIED`, `SIGNED_WEBHOOKS`
- `DELIVERY_EVENTS`, `BOUNCE`, `COMPLAINT`, `SUPPRESSION_SYNC`
- `PRODUCTION_DISPATCH_APPLICATION_ENABLED: DISABLED` at D22

Use snapshot to confirm sandbox certification coverage; do not treat as go-live approval.

### Kill switches

| Switch | D22 expected |
|--------|--------------|
| Global | **ON** (blocking) |
| Email | **ON** |
| SMS | **ON** |

Dashboard shows reason string from last control update.

### Dispatch availability summary

Preflight aggregate should show **`dispatchAvailable: false`** with blocking codes including:

- `POLICY_EXTERNAL_DISPATCH_DISABLED`
- `PROVIDER_DISPATCH_DISABLED`
- `GLOBAL_KILL_SWITCH` (and/or channel switches)

This is **healthy** at D22 ship — not an incident.

## Provider detail page

`/system/communications/providers/[provider]`

- Verify connection action (writes connection row, no secrets returned)
- Capability flag table
- Recent webhook processing counts (if exposed): `REJECTED`, `UNMATCHED`, `DUPLICATE` rates
- Link to webhook validation guide for drills

## Health indicators (operator)

| Indicator | Action |
|-----------|--------|
| Elevated webhook `REJECTED` | Check signing secret rotation, clock skew, vendor URL |
| Elevated `UNMATCHED` | Verify `providerMessageId` alignment on attempts |
| Verify failures | Confirm env keys in Netlify; run credential rotation procedure |
| `DEGRADED` state | Pause sandbox drills; do not enable dispatch |

## What the dashboard never shows

- API keys, webhook secrets, full webhook bodies
- Recipient email/phone from queue items
- Fabricated “sent” counts without attempt rows

## Related workflows

1. **Verify after env change** — rotation guide → verify → refresh dashboard
2. **Certification** — complete sandbox checklist before requesting production enablement
3. **Incident** — disaster recovery guide if vendor outage

## Related docs

- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_CREDENTIAL_ROTATION_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_PRODUCTION_ENABLEMENT_CHECKLIST.md`
