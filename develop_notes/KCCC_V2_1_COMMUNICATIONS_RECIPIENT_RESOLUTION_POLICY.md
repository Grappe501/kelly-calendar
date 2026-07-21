# KCCC V2.1 — Communications recipient resolution policy

**Scope:** Person-first resolution from criteria to manifest entries (D24)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`

## Principle

Recipient resolution is **deterministic, person-first, and fail-closed**. D24 proposes candidates and resolves destinations; D20 consent and suppressions decide whether a row may be included in queue prepare.

```text
Audience proposes → Consent/suppression decide → Dispatch transports
```

Resolution does **not** send messages, schedule sends, or call provider APIs.

## Resolution order

```text
1. Apply registered segment criteria (explicit sources only)
2. Resolve each candidate to a person identity (or standalone contact point)
3. Attach channel contact point for communication channel
4. Normalize destination (see DESTINATION_NORMALIZATION doc)
5. Evaluate suppressions (D20 — wins)
6. Evaluate consent evidence for channel + purpose (D20)
7. Evaluate contact verification policy (D20)
8. Evaluate external match status (D18 — CONFIRMED only)
9. Compute eligibility facts + warnings
10. Apply deduplication (person + channel)
11. Write manifest entries (immutable on finalize)
12. Operator inclusion review (INCLUDED | EXCEPTION_INCLUDED | EXCLUDED)
```

## Eligibility facts (representative)

| Fact | Meaning |
|------|---------|
| `ELIGIBLE` | Verified contact + effective consent + no suppression |
| `INELIGIBLE` | Missing consent for channel/purpose |
| `MISSING_CONTACT` | No contact point for channel |
| `UNVERIFIED` | Contact exists; policy requires verification |
| `SUPPRESSED` | Active suppression |
| `REQUIRES_REVIEW` | Shared contact conflict |
| `AMBIGUOUS` | Identity or external match unresolved |
| `BLOCKED_EXTERNAL` | D18 match not CONFIRMED |

Facts are **recomputed** at materialization and queue prepare — not cached as permanent consent.

## Person-first rules

1. One manifest entry represents one **person** (or explicit standalone contact) per channel destination.  
2. Mobilize event aggregates never become a single “recipient.”  
3. No Person auto-create from audience materialization unless explicitly approved in future governance — default: operator-linked identities only.  
4. External person fields enter tokens only through D24 resolved context — see D23 personalization policy.

## Inclusion vs eligibility

| Operator action | Effect |
|-----------------|--------|
| `INCLUDED` | Normal queue candidate when eligibility passes at prepare |
| `EXCEPTION_INCLUDED` | Explicit override with note — still re-checked at prepare |
| `EXCLUDED` | Removed from send set |

Inclusion does **not** override active suppression or missing consent at queue prepare unless policy explicitly allows attestation (default: **false**).

## Recipient context for D23

Resolved manifest entries supply canonical fields for token resolution:

- `recipient.first_name`, `recipient.full_name` — from person record when authorized  
- Destination refs — masked in UI; full ref server-side only for dispatch path  
- `recipientFingerprint` — hash of identity + channel + normalized destination ref  

Dispatch preflight rejects `RECIPIENT_FINGERPRINT_MISMATCH` when artifact context differs from queue item.

## Preview vs production resolution

| Mode | Data |
|------|------|
| Audience preview / count | **FABRICATED TEST DATA** or aggregate counts without PII |
| Manifest review | Redacted/masked destinations in operator UI |
| Queue prepare | Real resolved context for included members only |
| D23 PREVIEW artifact | **FABRICATED TEST DATA** — never queue-backed |

## Fail-closed

| Situation | Outcome |
|-----------|---------|
| Unknown segment key | Materialization blocked |
| Criteria params invalid | Materialization blocked |
| Manifest finalize with duplicate person+channel | Blocked |
| Manifest fingerprint mismatch at approval | Approval rejected |
| Prepare with stale manifest | Blocked — re-approve audience |

## Related

- `KCCC_V2_1_COMMUNICATIONS_DESTINATION_NORMALIZATION.md`  
- `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_DEDUPLICATION.md`  
- `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_CONSENT_AND_SUPPRESSION.md`  
- `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_MANIFEST_CONTRACT.md`
