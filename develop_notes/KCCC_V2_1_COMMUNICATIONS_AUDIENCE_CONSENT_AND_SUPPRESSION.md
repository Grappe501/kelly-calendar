# KCCC V2.1 — Communications audience consent and suppression

**Scope:** Eligibility gates in audience resolution (D24 reads, D20 owns)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`  
**Authoritative policy:** `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md`

## Principle

```text
Audience proposes candidates.
Consent and suppression decide eligibility.
Dispatch decides transport.
```

D24 **never** infers consent. D24 **never** bypasses suppressions. Inclusion intent loses to suppression and missing consent at queue prepare.

## Evaluation order (mandatory)

```text
1. Active suppression? → SUPPRESSED (stop)
2. Contact point for channel? → else MISSING_CONTACT
3. Verification satisfies policy? → else UNVERIFIED
4. Consent evidence effective for channel + purpose? → else INELIGIBLE
5. External match CONFIRMED when required? → else BLOCKED_EXTERNAL / AMBIGUOUS
6. Shared contact review required? → REQUIRES_REVIEW
7. Else ELIGIBLE (subject to operator inclusion)
```

Suppressions are evaluated **before** positive consent.

## Consent evidence (D20)

| Rule | Detail |
|------|--------|
| Channel-specific | EMAIL consent ≠ SMS consent |
| Purpose-specific | Volunteer vs fundraising vs event update |
| `UNKNOWN` | Stored for audit — **never** positive eligibility |
| Default accepted | `EXPLICIT_OPT_IN` only at conservative policy seed |
| Evidence source | Operator-recorded — not Mobilize RSVP |

## Suppression (D20)

| Source | Effect |
|--------|--------|
| Operator opt-out | Blocks channel or global |
| Policy hold | Blocks until cleared |
| Provider webhook (D21 path) | May create suppression when verified — future |

Active suppression blocks queue prepare even for `EXCEPTION_INCLUDED` unless explicit governance exception (default: **no bypass**).

## Warnings (not consent)

Materialization may attach warnings without granting eligibility:

- `SOURCE_NOT_CONSENT:STAFFING`  
- `SOURCE_NOT_CONSENT:RSVP`  
- `SOURCE_NOT_CONSENT:ATTENDANCE`  
- `SOURCE_NOT_CONSENT:CHECKIN`  

Operators must record consent evidence before expecting `ELIGIBLE`.

## Audience vs content vs dispatch approval

| Approval | Binds to |
|----------|----------|
| Audience | `manifestFingerprint` + inclusion snapshot |
| Content | D23 composition or D20 content fingerprint |
| Dispatch | Operator authorization to attempt external send |

Consent changes after audience approval mark communication `STALE` — re-approve audience after rematerialize.

## Preview and fabricated data

Consent evaluation in **preview** mode uses **FABRICATED TEST DATA** profiles — not real voter consent states. Preview must display banner **FABRICATED TEST DATA**.

## Production send

**Blocked at D24 ship.** Eligibility computation prepares queue — it does not dispatch.

## Related

- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md`  
- `KCCC_V2_1_COMMUNICATIONS_PROHIBITED_SEGMENTATION_POLICY.md`
