# KCCC V2.1 — Communication consent and suppression policy

**Scope:** Deliverable 20 (`CampaignCommunicationPolicy`, consent evidence, suppressions, eligibility engine) + D21 dispatch preflight gates  
**Status:** Active with D20 ship; D21 dispatch foundation documented — commit/deploy **TBD**  
**Parent:** `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20.md` · **D21:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_DISPATCH_FOUNDATION_DELIVERABLE_21.md`

## Purpose

Define how Kelly Calendar decides whether a person may appear on a **prepared communication queue** for a given **channel** and **purpose**. This policy governs planning, review, export, and handoff — not automated sending in D20.

## Core rule

> **Documented consent for the exact channel and purpose, on a verified contact point, with no active suppression.**

Operational participation is **never** sufficient.

## What is not consent

Kelly Calendar **never** treats the following as consent evidence:

| Signal | Treatment |
|--------|-----------|
| Mobilize RSVP / signup | Operational relevance warning only |
| Mobilize attendance observation | Same |
| Staffing assignment | Candidate source only |
| Staffing `CHECKED_IN` | Same |
| Field Ops / Execute check-in | Same |
| Campaign user membership alone | Contact hint only — needs evidence |
| Mobilize `sms_opt_in_status` | Not imported as consent in D18/D20 |
| Prior event attendance | Not inferred |
| `MANUAL_SCOPED` contact hints (D19) | Operational notes — not consent |
| Aggregate Mobilize counts | Cannot become audience members |

Engine warning codes: `SOURCE_NOT_CONSENT:<source>`.

## Consent evidence types

| Type | D20 default acceptance |
|------|------------------------|
| `EXPLICIT_OPT_IN` | **Accepted** — primary positive evidence |
| `CAMPAIGN_RELATIONSHIP` | Not in default map — requires policy change |
| `TRANSACTIONAL_CONTEXT` | Not in default map |
| `OPERATOR_ATTESTATION` | **Blocked** (`allowOperatorAttestation: false`) |
| `PROVIDER_IMPORT` | Not in default map — D21 webhook path may create suppressions; evidence import deferred to D22+ |
| `UNKNOWN` | Stored for audit; **never positive** (`UNKNOWN_EVIDENCE_NOT_POSITIVE`) |

Evidence must be:

- `ACTIVE` state
- Matching **channel** and **purpose**
- Within effective / expiry window
- Listed in policy `acceptedEvidenceByChannelPurpose` for the pair

## Contact points

| Verification | Effect when `requireVerifiedContact: true` |
|--------------|---------------------------------------------|
| `UNVERIFIED` | `UNVERIFIED` — blocked from `ELIGIBLE` |
| `OPERATOR_VERIFIED` | May proceed if evidence qualifies |
| `PROVIDER_VERIFIED` | May proceed if evidence qualifies (future) |
| `INVALID` | `INVALID_DESTINATION` — blocked |

Shared contact conflicts:

| `sharedContactMode` | Behavior |
|---------------------|----------|
| `BLOCK` | `INELIGIBLE` |
| `REQUIRE_REVIEW` (default) | `REQUIRES_REVIEW` unless otherwise eligible |
| `ALLOW` | Warning only |

External person linkage (D18):

| Match status | Effect |
|--------------|--------|
| `CONFIRMED` | Allowed path when other rules pass |
| `AMBIGUOUS` | `AMBIGUOUS` |
| `DO_NOT_LINK` | `INELIGIBLE` |
| Unreviewed | `INELIGIBLE` |

## Suppression (wins before consent)

Active suppressions matching channel/purpose scope block eligibility with state `SUPPRESSED`.

| Reason | Typical use |
|--------|-------------|
| `OPT_OUT` | Channel opt-out |
| `DO_NOT_CONTACT` | Global do-not-contact |
| `INVALID_DESTINATION` | Bad address/number |
| `BOUNCE` | Hard/soft bounce (future import) |
| `COMPLAINT` | Spam complaint |
| `WRONG_PERSON` | Mis-identified contact |
| `SHARED_CONTACT_RESTRICTED` | Shared inbox/phone policy |
| `PRIVACY_HOLD` | Legal/privacy hold |
| `MANUAL_POLICY` | Campaign manual rule |
| `UNKNOWN` | Documented but conservative |

Suppressions may be all-channel or channel-specific; optional purpose scope. Revocation requires operator action and audit — do not delete history.

## Eligibility evaluation order

1. Policy allows channel and purpose
2. Contact point present (else `MISSING_CONTACT`)
3. Identity / external match checks
4. Invalid destination check
5. **Active suppressions** (else continue)
6. Shared contact mode
7. Contact verification when required
8. Qualifying consent evidence (else `INELIGIBLE` or `REQUIRES_REVIEW`)

Suppression is evaluated **before** positive consent.

## Approval and fingerprints

| Approval | Invalidated when |
|----------|------------------|
| `AUDIENCE` | Audience membership or eligibility fingerprints change |
| `CONTENT` | Subject, body, or Mobilize URL fingerprint changes |
| `DISPATCH` | Required for D21 dispatch preflight when external dispatch enabled (D21 ship: dispatch still blocked by kill switches and policy) |

Default: separate audience and content approvals required. Default expiry: 72 hours when configured.

Queue idempotency key binds: communication id + audience member id + content fingerprint + audience fingerprint.

## Export and handoff vs delivery

| Action | Meaning |
|--------|---------|
| `EXPORTED` | CSV left the system — **not sent** |
| `HANDED_OFF` | Operator recorded manual transfer — **not sent** |
| `DISPATCHED` / delivery events | **Not available in D20** — no fabrication |

Audit metadata includes `notDelivery: true` on export and handoff actions.

## External dispatch gate (D20 + D21)

| Gate | D21 ship value |
|------|----------------|
| `externalDispatchEnabled` (policy) | `false` |
| D20 provider adapter (export/handoff) | `DisabledCommunicationProviderAdapter` |
| D21 dispatch provider (env unset) | `disabled` |
| Kill switches (global / email / SMS) | **ON** (blocking) |
| `applicationDispatchEnabled` (connection) | `false` |
| Mobilize messaging API | **Not available** |
| `attemptProviderDispatch` / bounded batch | Blocked with audit — batch status `BLOCKED` |

## Operator attestation

Disabled in default policy. Enabling attestation without legal review is **out of scope for D20 ship**.

## Retention

Policy model supports `retentionDays` — unset at defaults. Follow campaign records retention policy for consent and suppression audit rows.

## Related docs

- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md`
- `KCCC_V2_1_MOBILIZE_ATTENDANCE_PRIVACY_OPERATOR_GUIDE.md`
- `KCCC_V2_1_VOLUNTEER_STAFFING_OPERATOR_GUIDE.md`
- `KCCC_V2_1_PROVIDER_INTEGRATION_MOBILIZE_ARCHITECTURE.md`

## Provider webhook suppressions (D21)

Verified webhook events may create suppressions (`OPT_OUT`, `COMPLAINT`, `BOUNCE`, `INVALID_DESTINATION`) via `PROVIDER_WEBHOOK:{providerKey}` source. Temporary bounces do **not** auto-suppress. See `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_SECURITY.md`.

## Related D21 docs

- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_SELECTION_GUIDE.md`
