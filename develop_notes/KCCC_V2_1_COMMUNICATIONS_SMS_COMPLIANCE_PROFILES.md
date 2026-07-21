# KCCC V2.1 — Communications SMS compliance profiles

**Scope:** Registered SMS compliance profiles (D23)  
**Implementation path:** `src/lib/missions/v21/communications/composition/compliance/`  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`

## Purpose

SMS profiles enforce STOP/HELP language, length policy, encoding visibility, and test marking. Profiles complement D20 consent — they do not infer opt-in from participation signals.

## Profile registry (initial)

| Key | Use | Dispatch eligible at D23 ship |
|-----|-----|-------------------------------|
| `SMS_CAMPAIGN_STANDARD` | Campaign-facing SMS (future production) | No — production blocked |
| `SMS_INTERNAL` | Staff operational SMS | No |
| `SMS_SANDBOX_TEST` | Sandbox drills | Sandbox only |
| `SMS_INTERNAL_TEST` | Internal test copies | Sandbox / preview only |

## Profile fields (each profile defines)

| Field | Description |
|-------|-------------|
| `stopLanguageRequired` | e.g. `Reply STOP to opt out` |
| `helpLanguageRequired` | e.g. `Reply HELP for help` |
| `senderIdentificationRequired` | Org name in body or prefix |
| `maxSingleMessageLength` | Policy threshold before warning/block |
| `maxSegmentCount` | Warning/block threshold |
| `unicodeAllowed` | Whether UCS-2 encoding permitted |
| `testBannerRequired` | Prefix for sandbox/test |
| `allowedChannel` | `SMS` |
| `dispatchEligibility` | `NONE` · `SANDBOX` · `PRODUCTION` |
| `hiddenTrackingForbidden` | Always true in D23 |

## SMS_CAMPAIGN_STANDARD

- STOP and HELP language required in body or appended compliance suffix
- Character count and segment estimate shown to operator before approval
- No HTML — plain text only
- No silent truncation — exceed policy → `WARNING` or `BLOCKED`
- Links allowed; each URL in link manifest

## SMS_SANDBOX_TEST

- Mandatory prefix: e.g. `[TEST]` or `[SANDBOX]`
- Used with approved sandbox templates only
- Pair with **FABRICATED TEST DATA** preview profiles for non-send UI
- `dispatchEligibility: SANDBOX` — D21/D22 gates still apply

## SMS_INTERNAL / SMS_INTERNAL_TEST

- STOP/HELP may be relaxed for true internal recipients (document in brief)
- `SMS_INTERNAL_TEST` requires test banner for any external-looking number in sandbox drill

## Encoding and segments

Renderer surfaces:

- `characterCount` (grapheme-aware)
- `encodingClass` (`GSM-7` vs `UCS-2`)
- `estimatedSegments` (160/153 rules for multipart)

Unicode names in preview profiles (`Unicode name` persona) validate segment stress paths.

## Validation outcomes

| Condition | Typical result |
|-----------|----------------|
| Missing STOP when required | `BLOCKED` |
| Segments > policy max | `WARNING` or `BLOCKED` |
| HTML detected | `BLOCKED` |
| Subject line present | `BLOCKED` (SMS has no subject) |
| Prohibited personal data | `BLOCKED` |

## Production note

Compliance profile assignment does not open production dispatch. **DISPATCH BLOCKED** until production enablement checklist complete.

## Related

- `KCCC_V2_1_COMMUNICATIONS_EMAIL_COMPLIANCE_PROFILES.md`
- `KCCC_V2_1_COMMUNICATIONS_RENDERING_AND_SANITIZATION.md`
- `KCCC_V2_1_COMMUNICATIONS_PERSONALIZATION_POLICY.md`
