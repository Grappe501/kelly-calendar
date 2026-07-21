# KCCC V2.1 LG-1 Phase B — Provider Readiness Evidence

```text
Build:
KCCC-V2.1-LG-1-PHASE-B-PROVIDER-READINESS-1.0

LG-1 phase:
B — Provider Readiness

Status:
BLOCKED

Date:
2026-07-21

Operator:
Steve Grappe (Technical operator)

Reviewer:
Kelly Grappe (Readiness reviewer) — pending acceptance of this evidence

Repository commit:
3f7d0f6 (feature) / bafcb01 (hash pin)

Deployment ID:
6a5f7402b907704f2e8730a2
```

---

## 16.2 Role assignments

```text
Test owner:                 Steve Grappe
Technical operator:         Steve Grappe
Readiness reviewer:         Kelly Grappe
Authorization approver:     Kelly Grappe
Launch operator:            Steve Grappe
Recipient:                  Steve Grappe (campaign-controlled test address) — not configured this phase
Post-test reviewer:         Steve Grappe and Kelly Grappe
Incident lead:              Steve Grappe
```

Phase B does **not** authorize recipient, launch, provider submission, or live-test authorization.

---

## 16.3 Frozen baseline

```text
Milestone tag: KCCC-V2.1-COMMS-CORE-COMPLETE
Milestone commit: 6921cf3
Phase A evidence commit: 326492d
Phase A acceptance commit: 7cc4e32
Current commit: 3f7d0f6
Architecture changes since freeze: Phase B policy module + tests only (no production enablement; no D27)
```

---

## 16.3b Canonical audit

| Item | Path |
|------|------|
| Canonical provider adapter found | `ResendProviderAdapter` (official) |
| Provider registry | `src/lib/missions/v21/communications/providers/base/provider-registry.ts` |
| Provider connection / service | `src/server/services/communications-provider-service.ts` |
| Provider readiness (LG-1 Phase B) | `src/lib/missions/v21/communications/live-tests/provider/provider-readiness-policy.ts` |
| Live-test provider state | `CommunicationLiveTestProgram.providerState` + `live-test-policy.ts` |
| Credential resolution | `providers/base/credential-vault.ts` + Resend env keys |
| Webhook registry / route | `src/app/api/webhooks/communications/[provider]/route.ts` |
| Kill-switch / production gates | `providers/base/production-gates.ts` |
| Validation | `npm run missions:v21:communications-provider:validate` · live-test validate |
| Operator workspace | `/system/communications/providers` · `/system/communications/live-tests` |

Other adapters present: `kccc-sandbox` (cert harness), vendor stubs (`sendgrid`, `twilio`, `mailgun`, `postmark`, `amazon-ses`, `mailersend`), `disabled`.

---

## 16.4 Selected provider

```text
Provider: Resend
Channel: EMAIL
Adapter key: resend
Adapter path: src/lib/missions/v21/communications/providers/resend/adapter.ts
Provider state before Phase B: SANDBOX_ONLY (seeded live-test programs still on kccc-sandbox)
Reason selected: Only official commercial email adapter with fetch-based production endpoint, webhook secret path, and strongest D22 coverage
Other providers considered: kccc-sandbox (not live-eligible); sendgrid/twilio/etc. stubs (not production-capable)
Why not selected: stubs / sandbox harness cannot satisfy LG-1 live wire
```

---

## 16.5 Credential evidence

```text
Credential environment-variable names:
  KCCC_RESEND_API_KEY
  KCCC_RESEND_WEBHOOK_SECRET
  KCCC_RESEND_FROM_EMAIL
Optional:
  KCCC_COMMUNICATIONS_PROVIDER_KEY

Credential configured: NO (local approved env + Netlify production env key list)
Authentication status: NOT_CONFIGURED
Scope status: n/a
Secret scan: run at ship
Client-bundle scan: run at ship
No credential persisted: confirmed (none present to persist)
```

### Presence checks (booleans only)

| Source | API key | Webhook secret | From email | Provider key |
|--------|---------|----------------|------------|--------------|
| Local approved env | false | false | false | false |
| Netlify env list | false | false | false | false |

### Production API probe

```text
Endpoint classification: GET https://api.resend.com/domains (read-only)
Result: NOT_APPLICABLE — no API key configured
Authentication class: NOT_CONFIGURED
```

No message send. No recipient. No provider-side campaign mutation.

---

## 16.6 Capability matrix (code-level Resend adapter)

| Capability | Result | Evidence | Blocking? |
| ---------- | ------ | -------- | --------- |
| Production endpoint | SUPPORTED | Official adapter `api.resend.com` | No (adapter) / Yes until auth |
| Email send capability | SUPPORTED | EMAIL channel | No (adapter) / Yes until auth |
| Sender verification | SUPPORTED_WITH_LIMITATION | `KCCC_RESEND_FROM_EMAIL` + Phase C | Phase C |
| Domain verification | SUPPORTED_WITH_LIMITATION | capability + Phase C DNS | Phase C |
| Idempotency | SUPPORTED | idempotencyKey + D26 limit=1 | No |
| Provider message reference | SUPPORTED | providerMessageId path | No |
| Signed webhooks | SUPPORTED | webhook secret + verify path | Blocked until secret configured |
| Delivery events | SUPPORTED | webhook normalization | Pending Phase D |
| Bounce events | SUPPORTED | adapter event path | Pending Phase D |
| Complaint events | SUPPORTED_WITH_LIMITATION | where Resend emits | Pending Phase D |
| Suppression events | SUPPORTED | sync into D20; does not replace D20 | Pending Phase D/N |
| Rate-limit visibility | SUPPORTED_WITH_LIMITATION | matrix + dashboard | Noncritical |

**Effective LG-1 limit:** maximum provider requests = **1** (D26 authorization default).

---

## 16.7 Provider health (normalized)

```text
providerKey: resend
channel: EMAIL
state: SANDBOX_ONLY (programs) / AVAILABLE (registry without key)
authenticationStatus: NOT_CONFIGURED
endpointStatus: NOT_APPLICABLE
accountStatus: UNKNOWN
capabilityStatus: CODE_SUPPORTED
rateLimitStatus: DOCUMENTED_LIMITATION
webhookCapabilityStatus: READY_FOR_PHASE_D_WHEN_SECRET_PRESENT → currently BLOCKED (secret absent)
suppressionCapabilityStatus: CODE_SUPPORTED
killSwitchStatus: ACTIVE (defaults; production gates closed)
checkedAt: 2026-07-21T13:21:30Z / 13:22:50Z
expiresAt: n/a (not LIVE_TEST_READY)
warnings: credentials absent
blockingIssues: CREDENTIALS_NOT_CONFIGURED
evidenceHash: n/a (blocked)
```

---

## 16.8 Kill switches

```text
Global kill switch: active (default / foundation)
Channel kill switch: active (email)
Provider kill switch / production gates: closed (killSwitchOff=false)
Production campaigns: 0 authorized
General production flag: false
Scheduled live execution: unavailable / blocked
D25 production execution: blocked
D26 LIVE_TEST_READY marked: false
```

Distinction held:

```text
Provider readiness: NOT LIVE_TEST_READY (blocked)
Provider live transport: BLOCKED
General production: BLOCKED
```

---

## 16.9 Tests and validation

```text
npm run missions:v21:communications-live-test:validate → 320 PASS (includes Phase B policy tests)
npm run missions:v21:communications-provider:validate → 268 PASS
npm run typecheck → PASS
npm run build → PASS
npm run secret:scan → PASS
npm run security:bundle → PASS
npm run auth:routes:validate → PASS (webhook communications path SKIP as signature-auth public ingress)
npm run netlify:fail-closed:validate → PASS
```

Phase B policy unit file:

```text
tests/unit/missions/v21-communications-live-test-provider-readiness.test.ts
```

Narrow validator fix (not architecture change): `scripts/validate-route-auth-coverage.mjs` now correctly SKIPs `/api/webhooks/communications/*` as signature-authenticated ingress, matching D21/D22/D26 design.
---

## 16.10 Warnings and blocking issues

```text
Warnings:
- LIVE_TRANSPORT_REMAINS_BLOCKED_BY_KILL_SWITCHES (by design)
- GENERAL_PRODUCTION_REMAINS_BLOCKED (by design)
- Sender/domain DNS evidence deferred to Phase C
- Full production webhook drill deferred to Phase D

Blocking issues:
- CREDENTIALS_NOT_CONFIGURED — KCCC_RESEND_API_KEY / WEBHOOK_SECRET / FROM_EMAIL absent from local approved env and Netlify production env
- LIVE_TEST_READY not marked (correct fail-closed behavior)
```

---

## 16.11 Phase B result

```text
BLOCKED
```

---

## 16.12 Authorization statement

```text
The selected provider adapter (Resend) is the correct LG-1 candidate and is code-capable,
but Phase B cannot classify it LIVE_TEST_READY until server-side credentials authenticate.

No recipient has been approved.
No live-test authorization has been created.
No provider submission has occurred.
General production remains blocked.
Phase C is not automatically accepted by this document.
Do not begin Phase C until Phase B is re-run and accepted after credentials are installed.
```

---

## Remediation (Technical operator)

1. Install in **Netlify production** env (and local approved env for probes):  
   `KCCC_RESEND_API_KEY`, `KCCC_RESEND_WEBHOOK_SECRET`, `KCCC_RESEND_FROM_EMAIL`  
   Optional: `KCCC_COMMUNICATIONS_PROVIDER_KEY=resend`
2. Never commit values; never paste into docs/chat.
3. Re-run Phase B B2–B4 (read-only `GET /domains` auth probe).
4. Only then consider marking program provider state `LIVE_TEST_READY` while kill switches stay ON.
5. Obtain Kelly Grappe readiness acceptance before Phase C.

---

## Safety counts at Phase B close

```text
General production dispatch enabled: false
Production campaigns authorized: 0
Active live-test authorizations: 0
Approved live-test recipients: 0
Live provider requests: 0
LIVE_TEST_READY marked: false
```
