# KCCC V2.1 — Communications dispatch artifact contract

**Scope:** Boundary between D23 composition and D21/D22 dispatch  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`

## Canonical rule

```text
Composition creates approved rendered artifacts.
Dispatch transports approved rendered artifacts.
```

D21 must never copy editable draft fields (`subjectDraft`, `htmlDraft`, `bodyText`) into provider requests when a composition-backed communication is dispatch-ready. The **only** message body source for provider transport is a valid `CommunicationRenderArtifact` with purpose `DISPATCH`.

## Artifact eligibility

| Check | Requirement |
|-------|-------------|
| Exists | `communicationRenderArtifactId` on attempt |
| Purpose | `DISPATCH` only — not `PREVIEW`, `TEST`, or `APPROVAL` |
| Invalidation | `invalidatedAt` must be null |
| Approval | Source composition revision `APPROVED` |
| Hash | `contentHash` matches preflight snapshot |
| Recipient | `recipientFingerprint` matches queue item context |
| Channel | Matches queue item and provider capability |
| Composition | Not revoked; brief not cancelled |

Failure → preflight blocking codes; batch status `BLOCKED` or `PREFLIGHT_FAILED`.

## D21 preflight extensions

In addition to existing D21 codes (`MISSING_CONTENT_FINGERPRINT`, consent, kill switches, etc.):

| Code | Meaning |
|------|---------|
| `MISSING_RENDER_ARTIFACT` | No artifact attached |
| `ARTIFACT_WRONG_PURPOSE` | Not `DISPATCH` |
| `ARTIFACT_INVALIDATED` | Superseded or revoked |
| `COMPOSITION_NOT_APPROVED` | Revision lacks valid approval |
| `ARTIFACT_HASH_MISMATCH` | Content changed since attach |
| `RECIPIENT_FINGERPRINT_MISMATCH` | Wrong recipient context |
| `ARTIFACT_CHANNEL_MISMATCH` | EMAIL artifact on SMS item, etc. |

D20 content/audience/dispatch approvals and D21 kill switches remain mandatory. **Production dispatch stays blocked** at D23 ship regardless of artifact validity.

## Canonical provider transport payload

Adapters receive **only** this shape (conceptual TypeScript):

```ts
type CanonicalProviderMessage = {
  artifactId: string;
  channel: "EMAIL" | "SMS";
  destination: string; // normalized; from D20 queue — not from adapter
  subject?: string;      // EMAIL only — from artifact
  html?: string;         // EMAIL — sanitized render
  text: string;          // plain text (email alt or SMS body)
  metadata: {
    dispatchBatchId: string;
    dispatchAttemptId: string;
    contentHash: string;
    idempotencyKey: string; // existing D21 key includes content fingerprint
  };
};
```

## Adapter boundaries (D22)

| Adapter may | Adapter must not |
|-------------|------------------|
| Map `CanonicalProviderMessage` to vendor API JSON | Resolve `{{tokens}}` |
| Attach vendor auth headers | Modify URLs or add tracking |
| Return provider message id | Inject compliance footers |
| Normalize vendor status codes | Choose subject/body from drafts |
| Verify webhooks | Accept raw browser-supplied body |

Provider-specific payload shaping happens **inside** the adapter folder only (`src/lib/missions/v21/communications/providers/*`).

## Idempotency

Existing D21 idempotency key:

```text
dispatch:{providerKey}:{queueItemId}:{contentFingerprint}:{audienceFingerprint}
```

For composition-backed sends, `contentFingerprint` must derive from artifact `contentHash` (or equivalent binding) so content changes produce new keys — no duplicate send of stale body.

## Attachment workflow

1. Operator obtains composition approval
2. Operator generates `DISPATCH` artifact for target recipient context (D24 supplies bulk context)
3. D20 queue prepare links artifact id to queue items (or per-item attach)
4. D21 preflight validates artifact + D20 gates
5. Bounded batch creates attempts referencing artifact id
6. D22 adapter transports canonical payload — **no production at D23 ship**

## Legacy D20 path

Communications without composition continue using D20 `subject` / `bodyText` and `contentFingerprint()` from `eligibility.ts` until migrated. Dispatch preflight accepts either path — never both inconsistently for the same queue item.

## Audit

Log: dispatch artifact created · artifact invalidated · dispatch attachment attempted · dispatch attachment blocked · provider request with artifact id (redacted destination in audit).

## Related

- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`
- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_COMPOSITION_APPROVAL_GUIDE.md`
