# KCCC V2.1 — Communications audience approval guide

**Scope:** Human sign-off on recipient manifests (D24)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`  
**Governance:** `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_GOVERNANCE.md`

## Purpose

Audience approval certifies that the **frozen manifest** — who is proposed, how they were segmented, and who is included — matches campaign intent and compliance policy **before** queue prepare and dispatch artifact generation.

Audience approval is **separate** from content approval (D23/D20) and dispatch approval (D21).

## Prerequisites

1. Communication draft exists with explicit channel and purpose.  
2. Audience definition criteria version locked (registered keys only).  
3. Manifest finalized with valid dedupe and provenance.  
4. Operator completed inclusion review (`INCLUDED` / `EXCLUDED` / documented `EXCEPTION_INCLUDED`).  
5. Prohibited segmentation policy check passed — no SQL/CSV/ad hoc sources.  
6. Consent evidence adequate for expected `ELIGIBLE` rows — or operators accept export/handoff for ineligible majority.

## Reviewer checklist

| Check | Pass criteria |
|-------|---------------|
| Segment criteria | Only registry keys; params documented |
| Person-first | No Mobilize aggregate rows |
| Suppressions | Active suppressions not included |
| Shared contacts | `REQUIRES_REVIEW` rows resolved |
| Exception includes | Each has operator note |
| Count sanity | Included count matches intent — not fabricated preview |
| Fingerprints | `manifestFingerprint` displayed and stable |
| Preview labeling | Any sample rows marked **FABRICATED TEST DATA** if not manifest-backed |
| Dispatch state | Confirm **production dispatch blocked** — approval ≠ send |

## Approval binding

Approval record stores:

- `manifestFingerprint` (required exact match)  
- `segmentCriteriaFingerprint`  
- `approvedByUserId`, `approvedAt`  
- Optional reviewer note  

Any manifest, criteria, inclusion, or consent change invalidates approval → `STALE`.

## Roles

| Role | May approve audience? |
|------|------------------------|
| Campaign communications lead | Yes — default approver |
| Compliance reviewer | Recommended co-review for large or sensitive audiences |
| General volunteer operator | No |

Follow D20 `requireSeparateAudienceAndContentApproval: true` (default).

## After approval

1. Record audience approval in D20 approval table (`AUDIENCE` type) aligned with manifest fingerprint.  
2. Queue prepare may proceed — D20 re-evaluates consent at prepare time.  
3. D23 `DISPATCH` artifacts may be generated per queue item — still **DISPATCH BLOCKED** at ship.  
4. Export/handoff allowed per D20 policy — export ≠ sent.

## Rejection reasons (document in note)

- Unregistered segment criteria detected  
- Missing consent evidence for included set  
- Shared contact unresolved  
- Manifest fingerprint drift  
- Operator cannot explain `EXCEPTION_INCLUDED` rows  
- Suspected CSV/SQL workaround  

## What approval does not do

- Does not enable production dispatch  
- Does not schedule sends (D25)  
- Does not approve message copy (content approval)  
- Does not authorize provider batch (dispatch approval + D21 gates)

## Related

- `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_OPERATOR_GUIDE.md`  
- `KCCC_V2_1_COMMUNICATIONS_COMPOSITION_APPROVAL_GUIDE.md` (D23 content)  
- `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_MANIFEST_CONTRACT.md`
