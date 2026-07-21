# KCCC V2.1 — Communications composition approval guide

**Scope:** Human review and sign-off for compositions and template versions (D23)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`

## Principle

Approval binds to an **exact composition revision** and **content hash**. Approving content does **not** enable production dispatch — D21/D22 gates remain **DISPATCH BLOCKED** until production enablement checklist is complete.

## What requires approval

| Object | Approver action |
|--------|-----------------|
| `CommunicationTemplateVersion` | Approve template structure and token set for reuse |
| `CommunicationComposition` | Approve message instance before `DISPATCH` artifact generation |

Template version approval and composition approval are separate decisions.

## Composition approval flow

```text
Draft
  → Validate (server)
  → Ready for review (operator submit)
  → Reviewer opens exact revision (read-only snapshot)
  → APPROVED | CHANGES_REQUESTED | REVOKED
  → If APPROVED: generate APPROVAL artifact, then operator may request DISPATCH artifact
```

Reviewer must see: rendered preview, link manifest, compliance status, token resolution summary, revision number, and content hash.

## Approval must fail when

- Validation state is `BLOCKED`
- Required tokens unresolved
- Compliance profile requirements missing
- Unsafe or disallowed links
- Revision changed after review began (hash mismatch)
- Template version not `APPROVED` or superseded
- Channel mismatch (SMS template on EMAIL composition)
- Brief cancelled
- Prior approval `REVOKED`
- Fabricated preview mistaken for production recipient proof

## Binding fields (`CommunicationCompositionApproval`)

- `compositionRevisionId` — exact revision
- `contentHash` — must match revision at approval time
- `validationSnapshotJson` — frozen validation result
- `reviewerUserId`, `reviewNotes`, `decision`, `createdAt`

Any edit after approval sets composition to `CHANGES_REQUESTED` or `DRAFT` and **invalidates** prior approval automatically.

## Invalidation triggers

Subject/body/token override edits · template version change · brief cancellation · compliance profile change · manual revoke · hash drift detected on re-validate.

Invalidated approvals block new `DISPATCH` artifacts until re-approved.

## Separation of concerns

| Approval enables | Approval does not enable |
|------------------|--------------------------|
| `DISPATCH` artifact generation | Production dispatch |
| Attachment to D20 communication content review | Kill switch OFF |
| Dispatch preflight artifact checks | Policy `externalDispatchEnabled: true` |
| Sandbox test artifacts (separate path) | Auto-send on queue prepare |

## Reviewer checklist

1. Copy matches brief objective and prohibited-claims list
2. All links open intended HTTPS destinations (see link safety guide)
3. Compliance footer / STOP language present per profile
4. No prohibited tokens or internal-only fields in campaign copy
5. Preview labeled **FABRICATED TEST DATA** where applicable
6. SMS segment count acceptable under policy
7. Mobilize URLs reference verified external references (D20)

## Audit

Log: approval requested · granted · changes requested · revoked · dispatch artifact created · artifact invalidated · dispatch attachment blocked.

## Related

- `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_GOVERNANCE.md`
- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_ARTIFACT_CONTRACT.md`
- `KCCC_V2_1_COMMUNICATIONS_PRODUCTION_ENABLEMENT_CHECKLIST.md`
