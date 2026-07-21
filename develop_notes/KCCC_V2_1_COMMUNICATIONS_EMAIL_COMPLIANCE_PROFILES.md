# KCCC V2.1 — Communications email compliance profiles

**Scope:** Registered email compliance profiles (D23)  
**Implementation path:** `src/lib/missions/v21/communications/composition/compliance/`  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`

## Purpose

Compliance profiles centralize footer, identification, and test-banner rules instead of scattering logic across templates. D23 uses existing D20 consent and suppression doctrine — profiles do **not** replace consent checks at dispatch.

## Profile registry (initial)

| Key | Use | Dispatch eligible at D23 ship |
|-----|-----|-------------------------------|
| `EMAIL_CAMPAIGN_STANDARD` | Campaign-facing email (future production) | No — production blocked |
| `EMAIL_INTERNAL` | Staff/internal notifications | No |
| `EMAIL_SANDBOX_TEST` | Sandbox certification and drills | Sandbox only |

## Profile fields (each profile defines)

| Field | Description |
|-------|-------------|
| `requiredFooterFields` | Org name, address, contact as applicable |
| `unsubscribeRequired` | Whether unsubscribe mechanism text required |
| `senderIdentificationRequired` | From identity disclosure rules |
| `physicalAddressRequired` | CAN-SPAM-style address when applicable |
| `testBannerRequired` | Visible test marking |
| `allowedChannel` | `EMAIL` |
| `dispatchEligibility` | `NONE` · `SANDBOX` · `PRODUCTION` (D23: SANDBOX max) |
| `policyReferences` | Links to D20 purpose/channel rules |

## EMAIL_CAMPAIGN_STANDARD

- Unsubscribe language required (mechanism may be operational link — full preference center is out of D23 scope)
- Physical mailing address or approved alternative per legal review
- Sender identification (organization name + reply path via profile key)
- No script tags; plain-text alternative mandatory
- HTTPS links preferred; HTTP flagged

## EMAIL_INTERNAL

- Unsubscribe may be omitted when true internal-only audience (documented in brief)
- Test banner optional for non-external drafts
- Still requires sanitization and token registry compliance

## EMAIL_SANDBOX_TEST

- **Mandatory visible banner:** e.g. `[SANDBOX TEST — NOT A LIVE CAMPAIGN MESSAGE]`
- Used only with `TEST_ONLY` templates and sandbox dispatch path
- `dispatchEligibility: SANDBOX` — still subject to D21 kill switches and D22 sandbox gates
- Pair with preview profiles labeled **FABRICATED TEST DATA** for non-send previews

## Sender profiles

Templates reference `fromProfileKey` and `replyToProfileKey` — not arbitrary addresses. Approved keys map to verified sender identities in provider connection config (D22).

## Validation at render

Renderer injects compliance blocks **after** token resolution and **before** hash. Missing required footer → `BLOCKED`. Compliance manifest stored on artifact.

## Production note

Selecting `EMAIL_CAMPAIGN_STANDARD` on a template does not authorize production send. Full production requires `KCCC_V2_1_COMMUNICATIONS_PRODUCTION_ENABLEMENT_CHECKLIST.md` — **DISPATCH BLOCKED** until all gates true.

## Related

- `KCCC_V2_1_COMMUNICATIONS_SMS_COMPLIANCE_PROFILES.md`
- `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_GOVERNANCE.md`
- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md`
