# KCCC V2.1 — Communications personalization policy

**Scope:** Deterministic token resolution (D23)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`  
**Registry:** `KCCC_V2_1_COMMUNICATIONS_TOKEN_REGISTRY.md`

## Principle

Personalization is **deterministic, auditable, and fail-closed**. The renderer resolves only registered tokens from explicit context. It does not guess, infer, or invent recipient data.

Preview mode uses **FABRICATED TEST DATA** profiles — never real campaign contacts for casual preview.

## Resolution order

```text
1. Approved composition override (tokenOverridesJson — bounded to registered keys)
2. Canonical recipient field (from D24 recipient context when attached)
3. Mission or event field (from brief links)
4. Campaign configuration (approved static values)
5. Registered safe fallback (from token registry)
6. Unresolved required token → RENDER BLOCKED
```

Optional tokens may use approved fallback or empty string only when registry explicitly permits.

## Fail-closed rules

| Situation | Outcome |
|-----------|---------|
| Required token unresolved | `RENDER BLOCKED` — no partial send body |
| Prohibited token requested | Validation error |
| Unknown token in draft | Validation error |
| Recipient context missing for PERSONAL token | Fallback or block per registry |
| Override value fails type/format validation | Block |

## Forbidden inference

- Do **not** infer first names from email addresses
- Do **not** convert unknown names to informal nicknames
- Do **not** use RSVP, attendance, staffing, or check-in as consent or personalization source (D20 doctrine)
- Do **not** pull Mobilize person-level fields into tokens without D24 explicit resolution

## Safe greeting fallback

When `{{recipient.first_name}}` is missing, prefer:

```text
Hello,
```

Not `Hello friend,` unless campaign policy explicitly approves that language in the compliance profile.

## Personalization fingerprints

Each render artifact records:

- `personalizationFingerprint` — hash of resolved token values (redacted where sensitive)
- `recipientFingerprint` — hash of recipient identity context used for dispatch match
- `resolvedTokensJson` / `unresolvedTokensJson` for audit

Dispatch preflight rejects `RECIPIENT_FINGERPRINT_MISMATCH` when queue item context differs from artifact.

## Preview vs dispatch context

| Mode | Recipient data |
|------|----------------|
| Preview (`PREVIEW` artifact) | Fabricated profile only — banner **FABRICATED TEST DATA** |
| Sandbox test (`TEST` artifact) | Allowlisted sandbox destinations via D22 controls |
| Dispatch (`DISPATCH` artifact) | Real recipient context from D20 queue + D24 resolution |

Never present fabricated preview values as real voter data in the operator UI.

## Overrides

`tokenOverridesJson` on compositions may supply operator-approved values for registered keys only. Overrides:

- Must pass validator type and length checks
- Invalidate composition approval when changed after sign-off
- Cannot introduce unregistered keys

## Related

- `KCCC_V2_1_COMMUNICATIONS_TOKEN_REGISTRY.md`
- `KCCC_V2_1_COMMUNICATIONS_RENDERING_AND_SANITIZATION.md`
- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md` (D20 consent)
