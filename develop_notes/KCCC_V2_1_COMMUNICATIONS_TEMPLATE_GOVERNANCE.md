# KCCC V2.1 — Communications template governance

**Scope:** Template catalog lifecycle (D23)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`

## Purpose

Templates are **stable identities** with **immutable approved versions**. Human-readable names may change; `templateKey` must not.

Governance ensures only reviewed, channel-correct, compliance-bound template versions feed compositions and dispatch artifacts.

## Roles

| Role | May |
|------|-----|
| Campaign leadership | Create templates, draft versions, submit for review, approve (when authorized), retire |
| Reviewer (separate where policy requires) | Approve or reject version submissions |
| Engineering | Implement registry and validation — not content approval |

Separation of author and approver is recommended for campaign-facing templates; sandbox test templates may use a simplified path documented in seed policy.

## Template identity (`CommunicationTemplate`)

| Field | Rule |
|-------|------|
| `templateKey` | Unique, stable, kebab-case — e.g. `email-sandbox-test`, `sms-mission-reminder` |
| `channel` | `EMAIL` or `SMS` — one channel per template |
| `purpose` | Must align with D20 `CampaignCommPurpose` values |
| `status` | `DRAFT` → `ACTIVE` → `RETIRED` / `ARCHIVED` |
| `category` | e.g. `MISSION_PREPARATION`, `EVENT_REMINDER`, `TEST_ONLY` |

`TEST_ONLY` templates are the only category eligible for initial **approved** sandbox versions at D23 ship.

## Version lifecycle (`CommunicationTemplateVersion`)

| Status | Meaning |
|--------|---------|
| `DRAFT` | Editable by author |
| `IN_REVIEW` | Submitted; awaiting decision |
| `APPROVED` | **Immutable** — may be used in compositions |
| `SUPERSEDED` | Replaced by newer approved version |
| `REJECTED` | Not usable; reason recorded |

**Rule:** Editing an approved version creates a **new draft version** — never in-place mutation.

Each version carries:

- Channel-specific bodies: `subjectTemplate`, `htmlTemplate`, `textTemplate`, `smsTemplate`
- `requiredTokensJson` / `optionalTokensJson`
- `complianceProfileKey` (see email/SMS compliance profile docs)
- `contentHash` for deterministic identity

## Status transitions

```text
Template DRAFT → ACTIVE (when at least one APPROVED version exists)
Version DRAFT → IN_REVIEW → APPROVED | REJECTED
Version APPROVED → SUPERSEDED (when newer version approved)
Template ACTIVE → RETIRED (no new compositions) → ARCHIVED
```

Retiring a template does not delete versions or invalidate existing dispatch artifacts — it blocks **new** compositions from that template.

## Publication rules

1. No `APPROVED` campaign-facing template without human review.
2. Sandbox test templates (`TEST_ONLY`) may ship pre-approved for certification drills only.
3. Template version approval does **not** enable production dispatch.
4. Template tokens must exist in `KCCC_V2_1_COMMUNICATIONS_TOKEN_REGISTRY.md` before approval.
5. Compliance profile must match channel and intended use (internal vs campaign).

## Prohibited template content

- Script tags, executable attributes, or unapproved remote assets
- Arbitrary `from` / reply-to addresses — use sender profile keys only
- Unregistered tokens or object traversal (`{{user.profile.internalNotes}}`)
- Prohibited privacy-class fields (see token registry)
- Unsourced opponent claims or unverified statistics
- Hidden tracking pixels or URL rewriting (D23 excludes click tracking)

## Audit events (minimum)

Template created · status changed · version created · submitted · approved · rejected · superseded · retired · archived.

## Related

- `KCCC_V2_1_COMMUNICATIONS_TOKEN_REGISTRY.md`
- `KCCC_V2_1_COMMUNICATIONS_COMPOSITION_APPROVAL_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_EMAIL_COMPLIANCE_PROFILES.md`
- `KCCC_V2_1_COMMUNICATIONS_SMS_COMPLIANCE_PROFILES.md`
