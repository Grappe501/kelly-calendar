# KCCC V2.1 — Communications recipient manifest contract

**Scope:** Immutable audience snapshot for queue and dispatch (D24)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`  
**D21 reference:** `KCCC_V2_1_COMMUNICATIONS_DISPATCH_ARTIFACT_CONTRACT.md`

## Principle

A **recipient manifest** is an append-only snapshot of who was proposed, how they were resolved, what eligibility facts applied, and what inclusion decisions the operator made at approval time. Manifests are the auditable bridge between segment criteria and D20 queue items.

Manifests do **not** send messages. Manifests do **not** replace consent records.

## Contract fields (manifest header)

| Field | Requirement |
|-------|-------------|
| `manifestId` | Stable identifier |
| `communicationId` | Parent communication |
| `audienceDefinitionVersionId` | Frozen criteria version |
| `segmentCriteriaFingerprint` | Hash of applied registry criteria |
| `manifestFingerprint` | Hash of all entries + inclusion states |
| `channel` | Communication channel |
| `purpose` | Communication purpose |
| `entryCount` | Total rows |
| `includedCount` | INCLUDED + EXCEPTION_INCLUDED |
| `finalizedAt` | Immutable timestamp |
| `finalizedByUserId` | Operator auth audit |

## Contract fields (manifest entry)

| Field | Requirement |
|-------|-------------|
| `entryId` | Stable within manifest |
| `personIdentityKey` | Person-first key |
| `contactPointId` | D20 contact reference when present |
| `normalizedDestinationRef` | Masked ref — not raw PII in exports |
| `eligibilityFact` | Computed at finalize |
| `inclusionState` | INCLUDED \| EXCEPTION_INCLUDED \| EXCLUDED |
| `exceptionNote` | Required when EXCEPTION_INCLUDED |
| `recipientFingerprint` | Per-row dispatch match key |
| `provenanceJson` | Contributing segment criteria keys |
| `warningsJson` | SOURCE_NOT_CONSENT etc. |

## Immutability rules

1. **Finalize** locks entry rows — no in-place edits.  
2. Corrections create **new manifest version** with new fingerprint.  
3. Prior manifests preserved for audit — never hard-delete.  
4. Audience approval binds to exact `manifestFingerprint`.  
5. Queue prepare rejects mismatch between approved manifest and current prepare input.

## Relationship to D20 queue

```text
Manifest (D24) → audienceFingerprint → CampaignCommunicationAudienceMember → QueueItem
```

Queue item idempotency incorporates `audienceFingerprint` derived from approved manifest.

At prepare time, D20 **re-runs** consent/suppression — manifest inclusion alone is insufficient if facts changed.

## Relationship to D23 artifacts

`DISPATCH` purpose artifacts attach per queue item:

- `recipientFingerprint` must match manifest entry  
- Token context sourced from manifest resolution — not fabricated preview  

Preview artifacts use **FABRICATED TEST DATA** only.

## Export contract

Manifest CSV export (leadership only):

- Masked destinations  
- Eligibility facts and inclusion states  
- Fingerprints for approval audit  
- Banner: export ≠ sent ≠ delivered  

## Invalidation

| Event | Effect |
|-------|--------|
| New criteria version | Prior manifest stale for approval |
| Consent/suppression change | Recompute eligibility; may STALE communication |
| Destination normalization change | New manifest version required |
| Operator inclusion edit after finalize | Forbidden — new manifest instead |

## Blocking codes (representative)

`MANIFEST_NOT_FINALIZED` · `MANIFEST_FINGERPRINT_MISMATCH` · `MANIFEST_ENTRY_DUPLICATE` · `MANIFEST_MISSING_PROVENANCE` · `AUDIENCE_APPROVAL_STALE`

## Related

- `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_APPROVAL_GUIDE.md`  
- `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_DEDUPLICATION.md`
