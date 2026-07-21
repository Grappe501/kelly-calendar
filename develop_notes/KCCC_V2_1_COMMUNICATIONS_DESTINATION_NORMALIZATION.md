# KCCC V2.1 — Communications destination normalization

**Scope:** Channel destination canonicalization (D24)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_RESOLUTION_POLICY.md`  
**D20 model:** `CampaignContactPoint.normalizedDestination`

## Principle

Every manifest entry references a **normalized destination** aligned with D20 contact points. Normalization is deterministic — same input always yields same canonical value and fingerprint component.

Normalization prepares destinations for eligibility checks and dispatch preflight; it does **not** verify consent or send messages.

## Email

| Step | Rule |
|------|------|
| Trim | Leading/trailing whitespace removed |
| Case | Local-part case preserved; domain lowercased |
| Unicode | NFC normalize display name fields separately — not email local-part punycode unless IDNA domain |
| Invalid | Reject if fails RFC5322 pragmatic validator |
| Plus addressing | Preserved — not stripped unless campaign policy documents alias collapse (default: preserve) |
| Shared mailboxes | Flag `REQUIRES_REVIEW` under D20 `sharedContactMode: REQUIRE_REVIEW` |

Canonical form stored in `normalizedDestination`; UI shows masked display (`j***@example.com`).

## SMS / phone

| Step | Rule |
|------|------|
| Strip | Remove spaces, dashes, parentheses |
| Country | Default US (`+1`) when 10-digit NANP input unless explicit country code |
| E.164 | Store canonical E.164 in `normalizedDestination` |
| Invalid length | `MISSING_CONTACT` / validation error |
| Landline vs mobile | Not inferred — channel eligibility follows contact point metadata only |

## In-app / future channels

When channel expands beyond EMAIL/SMS, normalization rules must be registered before criteria allow that channel — no ad hoc string passthrough.

## Verification state

Normalization **≠ verification**. D20 `requireVerifiedContact: true` (default) blocks queue prepare for `UNVERIFIED` points even when normalized.

Operators verify contact points through D20 workflow — D24 does not auto-verify on materialization.

## Destination change detection

D21 preflight includes `DESTINATION_CHANGED` when queue item destination ref no longer matches manifest snapshot at prepare time.

Manifest or contact point edits after prepare invalidate audience approval → `STALE`.

## Suppression matching

Suppressions match on normalized destination + channel + campaign scope — see consent/suppression doc.

## Security

- Never log full destinations in client bundles or generic audit exports.  
- Server-side dispatch path uses destination ref IDs — not repeated raw PII in batch metadata.

## Related

- `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_DEDUPLICATION.md`  
- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20.md`
