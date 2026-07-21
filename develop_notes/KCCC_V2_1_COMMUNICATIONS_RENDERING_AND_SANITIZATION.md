# KCCC V2.1 — Communications rendering and sanitization

**Scope:** Canonical provider-neutral renderer (D23)  
**Implementation path:** `src/lib/missions/v21/communications/composition/rendering/`  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`

## Purpose

The renderer transforms an approved template version or composition revision plus explicit personalization context into **immutable render outputs**. It runs **server-side only** and never calls providers or reads credentials.

Existing D20 helpers (`sanitizeMessagePreviewHtml`, `renderContentPreview` in `content.ts`) remain for legacy preview paths; D23 canonical renders use the composition render engine.

## Renderer responsibilities

| Must do | Must not do |
|---------|-------------|
| Resolve registered tokens only | Call vendor APIs |
| Reject unresolved required tokens | Dispatch or queue mutate |
| Sanitize HTML | Store secrets in output |
| Generate plain-text email fallback | Execute scripts or remote assets |
| Normalize whitespace and line endings | Rewrite links for tracking |
| Produce deterministic `contentHash` | Accept arbitrary HTML from client without sanitization |
| Build link and compliance manifests | Decide sender addresses outside profile keys |
| Record `renderEngineVersion` | Run inside provider adapters |

## Pipeline

```text
Input: templateVersion + compositionRevision + personalizationContext + renderPurpose
  → token resolution (registry + policy)
  → channel renderer (email | sms)
  → sanitization pass
  → compliance profile injection
  → validation
  → artifact snapshot (hash + manifests)
```

## Email output shape

| Field | Requirement |
|-------|-------------|
| `subjectRendered` | Required; length validated |
| `htmlRendered` | Sanitized; no scripts; no executable attributes |
| `textRendered` | Required plain-text alternative |
| `fromProfileKey` / `replyToProfileKey` | Reference approved config — not free-text From |
| `linkManifest` | Extracted stable URL list |
| `complianceFooter` | Per profile |
| `contentHash` | SHA-256 truncated deterministic hash |

## SMS output shape

| Field | Requirement |
|-------|-------------|
| `smsRendered` | Plain text only — no HTML |
| `characterCount` | Grapheme-aware count |
| `encodingClass` | GSM-7 vs Unicode surfaced |
| `estimatedSegments` | Policy-visible — no silent truncation |
| `linkManifest` | URLs extracted |
| `complianceManifest` | STOP/help status |
| `contentHash` | Deterministic |

## HTML sanitization rules

- Strip `<script>`, event handlers (`onclick`, etc.), `javascript:` URLs
- Reject or strip unapproved remote assets (configurable allowlist for future)
- Escape or remove dangerous CSS expressions
- Preserve semantic structure needed for email clients (paragraphs, links, basic formatting)
- Plain-text generation strips tags and normalizes links to visible URLs

Build on `sanitizeMessagePreviewHtml` patterns; composition renderer applies **before** artifact persistence, not only at UI preview.

## Validation outcomes

| State | Meaning |
|-------|---------|
| `VALID` | Render succeeded; warnings optional |
| `WARNING` | Render succeeded; operator must acknowledge (e.g. long SMS) |
| `BLOCKED` | Render refused — no artifact or non-dispatch artifact only |

Blocked conditions include: unresolved required tokens, prohibited fields, unsafe links, missing compliance footer, missing plain-text alternative, structural HTML failure.

## Render purposes and labeling

| Purpose | Sanitization | UI label |
|---------|--------------|----------|
| `PREVIEW` | Full | **FABRICATED TEST DATA** when using preview profiles |
| `TEST` | Full | Sandbox test banner |
| `APPROVAL` | Full | Review snapshot — not dispatchable |
| `DISPATCH` | Full | Dispatch artifact — immutable |

## Fingerprints

- `contentHash` — canonical body + subject + compliance blocks
- `personalizationFingerprint` — resolved token payload (redacted)
- `recipientFingerprint` — dispatch match key

Changing any resolved byte invalidates dispatch eligibility and requires re-approval.

## Determinism

Same inputs (template version id, revision id, context, engine version) must produce identical `contentHash`. Tests enforce this in `missions:v21:communications-composition:validate`.

## Related

- `KCCC_V2_1_COMMUNICATIONS_EMAIL_COMPLIANCE_PROFILES.md`
- `KCCC_V2_1_COMMUNICATIONS_SMS_COMPLIANCE_PROFILES.md`
- `KCCC_V2_1_COMMUNICATIONS_LINK_SAFETY_GUIDE.md`
- `src/lib/missions/v21/communications/content.ts` (legacy preview helpers)
