# KCCC V2.1 — Communications Provider Selection & Sandbox Integration (Deliverable 22)

**Status:** Sandbox integration only — **production dispatch remains blocked**  
**Baseline:** D21 `KCCC_V2_1_COMMUNICATIONS_PROVIDER_DISPATCH_FOUNDATION_DELIVERABLE_21.md`  
**Parent:** D20 queue + D21 dispatch foundation  
**Next:** D23 message templates and content assembly (explicitly **not** in D22)

## Product purpose

Register vendor-neutral communications provider adapters, certify them in **sandbox mode only**, and wire credential verification + webhook ingress — **without** enabling live campaign dispatch to real recipients.

D22 answers: *Which provider can Kelly Calendar talk to in sandbox, and how do we prove the adapter is correct before production?* It does **not** answer: *When may operators send production messages?* (That requires every production gate in `KCCC_V2_1_COMMUNICATIONS_PRODUCTION_ENABLEMENT_CHECKLIST.md`.)

## Core principles

| Principle | Rule |
|-----------|------|
| Provider neutrality | Mission and dispatch layers never import vendor SDKs; only adapters do |
| Fail closed | Unknown provider keys resolve to `disabled`; unsigned webhooks rejected |
| Sandbox only at D22 ship | Connection mode `SANDBOX` or `DISABLED` — never `PRODUCTION` for live sends |
| No production messages | No real voter/recipient dispatch; sandbox drill addresses only |
| Secrets in env only | API keys and webhook secrets in Netlify/env — **never** DB, repo, or chat |
| DISPATCH blocked | All kill switches, policy gates, and `applicationDispatchEnabled` remain blocking until explicit production enablement pass |

## Architecture — Mission → Dispatch → Interface → Adapter → Vendor

```
CampaignCommunication (D20 queue)
        │
        ▼
communications-dispatch-service (Mission/Dispatch orchestration)
        │
        ▼
CommunicationProviderAdapter interface (D21 types — canonical boundary)
        │
        ├── disabled-adapter
        ├── kccc-sandbox (certification harness — no vendor network)
        └── resend-adapter (official D22 vendor — server fetch only)
                │
                ▼
           Resend API (sandbox credentials)
```

| Layer | Responsibility | Must not |
|-------|----------------|----------|
| **Mission** | D20 comms workflow, approvals, queue prepare | Call vendor APIs directly |
| **Dispatch** | Preflight, bounded batches, attempts, webhooks, kill switches | Bypass interface or infer consent |
| **Interface** | `CommunicationProviderAdapter` / `CanonicalCommunicationsProvider` contract | Store secrets or vendor-specific types |
| **Adapter** | `src/lib/missions/v21/communications/providers/*` | Skip registry registration |
| **Vendor** | External email/SMS API | Be referenced outside adapter folder |

Registry: `src/lib/missions/v21/communications/providers/provider-registry.ts` — single source of selectable production keys (excludes test-only adapters in production mode).

## Phases summary

| Phase | D22 scope | Production impact |
|-------|-----------|-------------------|
| **1 — Registry & stubs** | Register `disabled`, `kccc-sandbox`, `resend`; comparison matrix docs | None |
| **2 — Sandbox adapter** | `kccc-sandbox` harness exercises full interface without network | None |
| **3 — Resend adapter** | Server-side fetch to Resend sandbox; verify + capability discovery | None — mode locked `SANDBOX` |
| **4 — Webhook ingress** | Signed Resend webhooks → normalized delivery events | Sandbox events only |
| **5 — Certification** | Run sandbox certification checklist; health dashboard read paths | None |
| **6 — Operator UX** | Provider dashboard shows registered adapters, verify, capability flags | `applicationDispatchEnabled: false` |

**Not in D22:** template rendering (D23), production mode promotion, kill-switch OFF, policy `externalDispatchEnabled: true`.

## What shipped (D22)

| Item | Detail |
|------|--------|
| Provider folder | `src/lib/missions/v21/communications/providers/` |
| Official vendor adapter | **Resend** — outbound via server `fetch`; no client-side keys |
| Certification harness | **`kccc-sandbox`** — deterministic scenarios mirroring production interface |
| Registry | `provider-registry.ts` lists keys; production excludes `kccc-test` |
| Env (Resend sandbox) | `KCCC_COMMUNICATIONS_PROVIDER_KEY=resend`, `KCCC_RESEND_API_KEY`, `KCCC_RESEND_WEBHOOK_SECRET` |
| Verify connection | Leadership UI writes `CommunicationProviderConnection` with `applicationDispatchEnabled: false` |
| Webhook route | `/api/webhooks/communications/[provider]` — signature required |
| Validation script | `npm run missions:v21:communications-provider:validate` (sandbox certification suite) |
| Operator docs | This deliverable + companion guides under `develop_notes/` |

## What is NOT in D22

| Exclusion | Owner |
|-----------|-------|
| Message templates, merge fields, HTML assembly | **D23** |
| Production dispatch to real recipients | Production enablement pass (post-D22) |
| SMS live send (unless adapter certifies SMS in sandbox drill) | Future adapter work |
| Auto-send on queue prepare/approval | Permanent exclusion |
| Consent inference from provider events | D20 policy only |
| Secrets in database | Permanent exclusion |
| Unbounded batch drain / background workers | D21 cap (25) unchanged |

## Environment (sandbox)

| Variable | Purpose |
|----------|---------|
| `KCCC_COMMUNICATIONS_PROVIDER_KEY` | `resend` for sandbox drill; unset → `disabled` |
| `KCCC_RESEND_API_KEY` | Resend sandbox API key — Netlify env only |
| `KCCC_RESEND_WEBHOOK_SECRET` | Webhook signing secret — Netlify env only |

**Do not** set production Resend keys until production enablement checklist is complete and leadership authorizes go-live.

## Acceptance criteria

- [ ] Registry returns `resend` and `kccc-sandbox` in appropriate modes; unknown keys → `disabled`
- [ ] Resend adapter passes sandbox certification checklist (all required scenarios)
- [ ] `kccc-sandbox` harness passes without network (CI-safe)
- [ ] Verify connection succeeds with valid sandbox credentials; fails closed without
- [ ] Webhook signature verification + replay dedupe operational for Resend sandbox
- [ ] Provider dashboard shows capability flags — **no secret values** in API/UI
- [ ] Dispatch preflight still reports `dispatchAvailable: false` with blocking reasons at D22 ship
- [ ] Kill switches remain default **ON**
- [ ] `applicationDispatchEnabled` remains **false** on all connections
- [ ] Policy `externalDispatchEnabled` unchanged (false unless separately authorized)
- [ ] Zero production recipient messages sent as part of D22 validation
- [ ] Rollback doc reviewed; rollback drill: unset provider key → `disabled`

## Production gates (all required — DISPATCH BLOCKED until true)

See `KCCC_V2_1_COMMUNICATIONS_PRODUCTION_ENABLEMENT_CHECKLIST.md`. D22 **does not** check these boxes.

Summary: verified provider, explicit `applicationDispatchEnabled`, policy enable, kill switches OFF with reason, webhook registered, sandbox drill signed off, legal review, runbooks, rollback acknowledged.

## Validation

```bash
npm run missions:v21:communications-dispatch:validate
npm run missions:v21:communications-provider:validate
npm run typecheck
```

## Operator guides

| Doc | Use |
|-----|-----|
| `KCCC_V2_1_COMMUNICATIONS_PROVIDER_ADAPTER_DEVELOPMENT_GUIDE.md` | Implement new vendors |
| `KCCC_V2_1_COMMUNICATIONS_SANDBOX_CERTIFICATION_CHECKLIST.md` | Certify adapter before promotion |
| `KCCC_V2_1_COMMUNICATIONS_PROVIDER_HEALTH_DASHBOARD_GUIDE.md` | Monitor connection health |
| `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_VALIDATION_GUIDE.md` | Webhook drill |
| `KCCC_V2_1_COMMUNICATIONS_CREDENTIAL_ROTATION_GUIDE.md` | Rotate env secrets |
| `KCCC_V2_1_COMMUNICATIONS_PRODUCTION_ENABLEMENT_CHECKLIST.md` | Go-live gates (not D22) |
| `KCCC_V2_1_COMMUNICATIONS_PROVIDER_COMPARISON_MATRIX.md` | Capability comparison |
| `KCCC_V2_1_COMMUNICATIONS_PROVIDER_DISASTER_RECOVERY_GUIDE.md` | Outage response |
| `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22_ROLLBACK.md` | Rollback |

## Rollback

See `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22_ROLLBACK.md`.

## Related

- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_SELECTION_GUIDE.md` (D22 section)
- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_SECURITY.md`
- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20.md`
