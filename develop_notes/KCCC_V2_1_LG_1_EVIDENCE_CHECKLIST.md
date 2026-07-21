# KCCC V2.1 LG-1 Evidence Checklist

Companion to `KCCC_V2_1_LG_1_CONTROLLED_LIVE_TEST_OPERATOR_RUNBOOK.md`.

**Status:** NOT STARTED  
**Test ID:** LG-1  
**Milestone:** `KCCC-V2.1-COMMS-CORE-COMPLETE` @ `6921cf3`  
**General production dispatch:** blocked  

Mark each item: `[ ]` pending · `[x]` complete · `[N/A]` not applicable · `[!]` stop / incident  

Do not record secrets, raw destinations, API keys, or webhook signing secrets.

---

## Roles

| Role | Name | Self-review disclosed? |
|------|------|------------------------|
| Test owner | | |
| Technical operator | | |
| Readiness reviewer | | |
| Authorization approver | | |
| Launch operator | | |
| Recipient | | |
| Post-test reviewer | | |
| Incident lead | | |

---

## Test identity

| Field | Value |
|-------|-------|
| Program name | KCCC First Controlled Email Live Test |
| Channel | EMAIL |
| Provider | |
| Provider connection ID | |
| Sender profile | |
| Sending domain | |
| Recipient (masked) | |
| Composition / revision | |
| Render artifact ID | |
| Content hash | |
| Planned launch date | |
| Authorized window | |

---

## Phase A — Baseline

- [ ] A1 Tag `KCCC-V2.1-COMMS-CORE-COMPLETE` present @ `6921cf3`
- [ ] A1 Current commit recorded; unexpected changes reviewed
- [ ] A2 Deployment accessible (`6a5f14a344a6f7e9df2651a6` or current prod)
- [ ] A2 Live-test workspace authenticated
- [ ] A3 `npm run missions:v21:communications-live-test:validate` ≥ 309 pass
- [ ] A3 Typecheck / build / secret scan / client-bundle / protected routes / webhook fail-closed
- [ ] A4 Starting blocked state recorded (production false; kill switches active; auth/recipients/requests = 0)

```text
A3 validation notes:
A4 timestamp:
```

---

## Phase B — Provider

- [ ] B1 One provider selected (recommended: resend)
- [ ] B2 Credentials server-side only; auth succeeds; scope minimum
- [ ] B3 Provider state = `LIVE_TEST_READY` (not general production)
- [ ] B4 Health / channel / idempotency / rate-limit / suppression checks pass

```text
Provider evidence hash:
Health expires:
```

---

## Phase C — Sender & domain

- [ ] C1 Exact sender profile bound; no client override
- [ ] C2 Sender identity verified
- [ ] C3 DKIM verified; SPF verified or documented alignment; DMARC surfaced; provider domain verified

```text
Sender verified at / expires:
Domain evidence expires:
Warnings disposition:
```

---

## Phase D — Webhooks

- [ ] D1 Endpoint reachable; no session auth; bound to provider
- [ ] D2 Unsigned / invalid / unknown / disabled rejected
- [ ] D3 Valid signature accepted; normalized; replay-safe; does not launch

```text
Webhook readiness:
```

---

## Phase E — Recipient

- [ ] E1 Exactly one campaign-controlled / explicitly consenting recipient
- [ ] E2 Ownership method recorded
- [ ] E3 Consent scope `COMMUNICATIONS_CONTROLLED_LIVE_TEST` bound to person/destination/channel
- [ ] E4 Suppressions clear (timestamp recorded)

```text
Ownership method:
Consent evidence ID:
Suppression check at:
```

---

## Phase F — Message

- [ ] F1 Narrow test brief (no persuasion / fundraising)
- [ ] F2–F3 Subject/body match approved starting content + compliance footer
- [ ] F4 Dispatch artifact valid; hashes recorded
- [ ] F5 Human content review complete

```text
Artifact ID / content hash:
Reviewed by / at:
```

---

## Phase G — Readiness

- [ ] G1 Revision binds exact provider/sender/domain/recipient/artifact; limits 1/1/1; no retries; no audience
- [ ] G2 D26 readiness status = APPROVED; warnings dispositioned

```text
Readiness review ID / hash:
Expires:
```

---

## Phase H — Authorization

- [ ] H1 One-time auth with shipped limits and exact bindings
- [ ] H2 Typed phrase `AUTHORIZE ONE LIVE TEST`
- [ ] H2 Production still blocked after authorization

```text
Authorization ID / hash:
Window start / end:
Authorized by:
Self-authorization disclosed:
```

---

## Phase I — Pre-launch hold

- [ ] Exact identity confirmed
- [ ] Kill switches / production / schedule / retry states confirmed
- [ ] Consent / suppression / destination / artifact / provider / webhook rechecked
- [ ] Operator confirmations acknowledged
- [ ] Hold checklist timestamp recorded

```text
Hold completed at:
```

---

## Phase J — Launch

- [ ] J1 Typed `SEND ONE CONTROLLED TEST` once (no double-submit)
- [ ] J3 Immediate status recorded (one of PREFLIGHT_BLOCKED / SUBMITTING / SUBMITTED / ACCEPTED / FAILED / UNKNOWN)

```text
Attempt ID:
Provider request fingerprint:
Provider message reference:
Authorization consumed:
Provider request count:
Status / timestamp:
```

---

## Phase K — Post-launch safety

- [ ] Production dispatch still false
- [ ] Production campaigns authorized = 0
- [ ] D25 production / scheduled / audience live unavailable
- [ ] Auth consumed or safely blocked; retries false
- [ ] Kill switches active; provider still `LIVE_TEST_READY`
- [ ] Post-test safety verification evidence recorded

```text
Safety evidence hash:
Critical incident if failed: yes / no
```

---

## Phase L — Reconciliation

- [ ] L1 Submitted / accepted / rejected / unknown recorded separately
- [ ] L2 Webhook events: signature, replay, normalize, match
- [ ] L3 Delivery status set (do not equate accept = deliver)

```text
Delivery status:
Events observed:
```

---

## Phase M — Recipient confirmation

- [ ] Confirmation status recorded (separate from provider)

```text
Status / method / at:
```

---

## Phase N — Suppression

- [ ] No unexpected suppression / unsubscribe / complaint
- [ ] Untested negative paths marked sandbox-only / not observed

```text
Notes:
```

---

## Phase O — Evidence package

- [ ] Items 1–24 from runbook §20 assembled (no secrets / raw destinations)

```text
Package location / reference:
```

---

## Phase P — Post-test review

| Category | Classification (VERIFIED / OBSERVED / INFERRED / NOT_TESTED / BLOCKED / FAILED) |
|----------|----------------------------------------------------------------------------------|
| Provider authentication | |
| Sender identity | |
| Domain authentication | |
| Recipient verification | |
| Consent | |
| Suppression | |
| Content rendering | |
| Personalization | |
| D21 preflight | |
| Provider submission | |
| Webhook verification | |
| Delivery evidence | |
| Recipient confirmation | |
| Authorization consumption | |
| Emergency controls | |
| Production-block restoration | |
| Security | |
| Incidents | |

### Required questions (Y/N + note)

1. Provider authenticated?
2. Exact verified sender used?
3. Domain checks passed?
4. Only approved destination?
5. D21 before submission?
6. Consent/suppressions rechecked?
7. Exactly one provider request?
8. Authorization consumed atomically?
9. Acceptance ≠ delivery distinguished?
10. Webhook signature verified?
11. Event normalized and reconciled?
12. Recipient confirmed receipt?
13. Unexpected suppressions?
14. Duplicate submission risk?
15. Secrets exposed?
16. Production remained blocked?
17. Authorization reusable? (must be no)
18. D25 could schedule/repeat? (must be no)
19. Different recipient/artifact substitutable? (must be no)
20. Evidence sufficient for next governance decision?

---

## Outcome

```text
LG-1 status:                    (Passed / Passed with warnings / Blocked before submission / Failed / Unknown provider outcome)
Test date:
Provider / channel:
Recipients authorized:
Provider requests attempted:
Provider requests accepted:
Messages delivered:
Delivery unknown:
Authorization consumed:
Automatic retries:              0
Audience-derived recipients:    0
Scheduled live executions:      0
Production campaigns authorized: 0
General production dispatch:    false
Production kill switches:       active
Incidents:
Warnings:
```

## Decision gate

```text
[ ] A — Passed → begin D27 governance design
[ ] B — Passed with warnings → resolve evidence gaps first
[ ] C — Blocked → correct issue; new authorization only after review
[ ] D — Failed → freeze live testing; incident remediation
```

Accepted by: ________________  Date: ________________

**Governing reminder:** LG-1 does not enable production campaigns, retries, schedules, or D27 implementation. General production dispatch remains blocked.
