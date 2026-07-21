# KCCC V2.1 — Communications token registry

**Scope:** Canonical personalization tokens (D23)  
**Implementation path:** `src/lib/missions/v21/communications/composition/tokens/`  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`

## Purpose

One registry defines every token that may appear in templates or compositions. Unknown tokens are **rejected at validation**. Arbitrary object traversal is forbidden.

Syntax: `{{namespace.field}}` — e.g. `{{recipient.first_name}}`, `{{mission.title}}`.

## Token metadata (required per token)

| Property | Description |
|----------|-------------|
| `key` | Canonical token string |
| `description` | Operator-facing meaning |
| `dataType` | `STRING` · `DATE` · `DATETIME` · `TIME` · `NUMBER` · `BOOLEAN` · `URL` · `EMAIL` · `PHONE` |
| `allowedChannels` | `EMAIL` · `SMS` or both |
| `source` | Documented data origin (recipient, mission, event, campaign config) |
| `privacyClassification` | See below |
| `requiredPermission` | Role or policy gate if sensitive |
| `fallbackPolicy` | Safe default or block |
| `formattingRules` | Date/time/phone formatting |
| `exampleValue` | For docs and **FABRICATED TEST DATA** previews only |

## Privacy classifications

| Class | Render rule |
|-------|-------------|
| `PUBLIC` | Allowed in campaign templates |
| `INTERNAL` | Internal-notification templates only |
| `PERSONAL` | Allowed when recipient context authorized (D24) |
| `SENSITIVE` | Blocked from campaign templates by default |
| `PROHIBITED` | **Never render** — validation blocks |

## Prohibited fields (default — do not expose as tokens)

Internal notes · private relationship scores · health or financial information · protected demographic inferences · opposition-research classifications · internal confidence scores · raw database identifiers · authentication secrets · consent evidence details · suppression reasons beyond operational necessity · field-ops confidential staffing (see D20 `FORBIDDEN_CONTENT_FIELD_HINTS`).

## Registered token catalog (initial)

### Recipient

| Token | Type | Channels | Privacy | Fallback |
|-------|------|----------|---------|----------|
| `{{recipient.first_name}}` | STRING | EMAIL, SMS | PERSONAL | `Hello,` (no guessed name) |
| `{{recipient.full_name}}` | STRING | EMAIL, SMS | PERSONAL | Omitted or formal greeting per policy |
| `{{recipient.email}}` | EMAIL | EMAIL | SENSITIVE | Block in body; not for SMS |
| `{{recipient.phone}}` | PHONE | SMS | SENSITIVE | Block in marketing copy |

### Mission

| Token | Type | Channels | Privacy |
|-------|------|----------|---------|
| `{{mission.title}}` | STRING | EMAIL, SMS | PUBLIC |
| `{{mission.date}}` | DATE | EMAIL, SMS | PUBLIC |
| `{{mission.location}}` | STRING | EMAIL, SMS | PUBLIC |
| `{{mission.time}}` | TIME | EMAIL, SMS | PUBLIC |

### Event

| Token | Type | Channels | Privacy |
|-------|------|----------|---------|
| `{{event.title}}` | STRING | EMAIL, SMS | PUBLIC |
| `{{event.start_time}}` | DATETIME | EMAIL, SMS | PUBLIC |
| `{{event.location}}` | STRING | EMAIL, SMS | PUBLIC |
| `{{event.mobilize_url}}` | URL | EMAIL, SMS | PUBLIC — must pass link inspector |

### Campaign

| Token | Type | Channels | Privacy |
|-------|------|----------|---------|
| `{{campaign.candidate_name}}` | STRING | EMAIL, SMS | PUBLIC |
| `{{campaign.reply_email}}` | EMAIL | EMAIL | PUBLIC |
| `{{campaign.organization_name}}` | STRING | EMAIL, SMS | PUBLIC |

### Communication (composition-scoped)

| Token | Type | Channels | Privacy |
|-------|------|----------|---------|
| `{{communication.call_to_action}}` | STRING | EMAIL, SMS | PUBLIC |
| `{{communication.subject}}` | STRING | EMAIL | PUBLIC |

## Validation rules

1. **Required token missing** → `RENDER BLOCKED`
2. **Optional token missing** → registered fallback or empty if explicitly permitted
3. **Unknown token in template** → validation error before render
4. **Prohibited class in campaign template** → blocked
5. **No inference** — do not derive first names from email local-part

## Extension process

1. Propose token with full metadata and privacy review.
2. Add to `token-registry.ts` and validation suite.
3. Update this doc and template governance.
4. Do not add tokens via template alone — registry is authoritative.

## Related

- `KCCC_V2_1_COMMUNICATIONS_PERSONALIZATION_POLICY.md`
- `KCCC_V2_1_COMMUNICATIONS_RENDERING_AND_SANITIZATION.md`
