# KCCC V2.1 — Communications recipient deduplication

**Scope:** One queue slot per person per channel (D24)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_RESOLUTION_POLICY.md`

## Principle

Deduplication prevents duplicate sends to the same person on the same channel within one communication manifest — without merging distinct people who share a contact point.

Dedupe runs **after** normalization and **before** manifest finalize.

## Primary dedupe key

```text
(campaignScopeKey, communicationId, personIdentityKey, channel, normalizedDestination)
```

| Component | Rule |
|-----------|------|
| `personIdentityKey` | Stable person ID, campaign user ID, or standalone contact point ID |
| `channel` | EMAIL or SMS (communication channel) |
| `normalizedDestination` | Post-normalization canonical value |

## Collision handling

When multiple criteria sources surface the same dedupe key:

1. **Merge provenance** — record all contributing segment criteria in manifest entry metadata.  
2. **Keep strictest eligibility** — if any path is `SUPPRESSED`, row is `SUPPRESSED`.  
3. **Union warnings** — combine `SOURCE_NOT_CONSENT:*` flags.  
4. **Single inclusion state** — operator sets one inclusion decision for the deduped row.

## Shared contact points (different people)

When two person identities normalize to the same email or phone:

- Do **not** auto-merge people.  
- Both rows remain with `REQUIRES_REVIEW` under shared contact policy.  
- Operator resolves via exclusion or documented exception — not silent merge.

## Cross-communication dedupe

D24 dedupe is **per communication manifest** — not global campaign suppression of duplicates across separate sends (future D25 orchestration may coordinate batch windows; not in D24).

## Manifest finalize validation

Finalize blocked when:

- Duplicate dedupe keys exist with conflicting inclusion states  
- Duplicate keys exist with unresolved person identity merge  

## Queue idempotency alignment

D20 queue item idempotency includes audience + content fingerprints — deduped manifest ensures one queue item per dedupe key at prepare time.

D21 dispatch idempotency unchanged:

```text
dispatch:{providerKey}:{queueItemId}:{contentFingerprint}:{audienceFingerprint}
```

## Related

- `KCCC_V2_1_COMMUNICATIONS_DESTINATION_NORMALIZATION.md`  
- `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_MANIFEST_CONTRACT.md`
