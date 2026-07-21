# D23 Rollback — Communications Template, Personalization & Composition Foundation

**Companion:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`

## Principle

Disable composition mutations and dispatch-artifact attachment; **preserve** template, revision, artifact, and audit history. Rollback must not imply messages were sent or erase approval evidence without authorization.

Composition rollback does **not** re-enable production dispatch. D21 kill switches and D22 provider gates remain authoritative.

## Immediate disable (no deploy required)

1. **Leave D21 kill switches ON** and D20 `externalDispatchEnabled: false` — production remains **DISPATCH BLOCKED**.
2. **Unset or ignore composition dispatch-artifact attachment** at the API layer if investigating incidents (return feature-disabled or 503 as implemented).
3. **Do not** approve new template versions or composition revisions during rollback investigation.
4. **Preserve** all `CommunicationRenderArtifact` rows — mark invalidated only through documented operator action, not bulk delete.

## Code rollback (if reverting D23 commit)

1. Confirm D21 dispatch still rejects missing or composition-backed artifacts (falls back to D20-only path).
2. Disable composition workspace routes and API mutations.
3. Revert D23 feature commit; redeploy.
4. Re-run validation suites:

```bash
npm run missions:v21:communications-dispatch:validate
npm run missions:v21:communications-provider:validate
npm run typecheck
```

5. Confirm D20 export/handoff and D21 blocked-batch audit behavior unchanged.

## Migration rollback (exceptional)

D23 adds additive tables (templates, versions, briefs, compositions, revisions, artifacts, approvals). **Do not** drop tables routinely.

Revert migration only when:

- D23 tables unused or sandbox-only rows with zero dispatch attachments, **or**
- Full DB backup taken and Steve authorized schema rollback

| Table | Rollback impact |
|-------|-----------------|
| `CommunicationTemplate` | Preserve; set status `ARCHIVED` if reverting UI |
| `CommunicationTemplateVersion` | Preserve approved versions for audit |
| `CommunicationBrief` | Preserve |
| `CommunicationComposition` | Preserve; revoke active approvals |
| `CommunicationCompositionRevision` | Preserve immutable history |
| `CommunicationRenderArtifact` | **Preserve** — dispatch audit may reference |
| `CommunicationCompositionApproval` | Preserve |

## Dispatch integration rollback

If D23 extended D21 attempts with `communicationRenderArtifactId`:

1. Stop accepting new artifact attachments.
2. In-flight batches with artifacts: preserve attempt rows; do not fabricate delivery events.
3. Preflight should block with `MISSING_RENDER_ARTIFACT` or legacy D20 fingerprint path only — never send draft fields.

## Do not

- Bulk-delete artifacts or approvals during rollback
- Fabricate delivery events to close batches
- Use real voter contacts for “rollback testing” previews
- Present fabricated preview data as real recipient data
- Enable production dispatch “to verify rollback”
- Store rollback secrets in repo or tickets
- Force-push `main` without approval
- Drop D20 consent, suppression, or D21 dispatch tables

## Restore prior state (D22-only content path)

1. D20 subject/body editing and content fingerprint remain operational.
2. D21 dispatch preflight uses D20 fingerprints without artifact requirement (pre-D23 behavior).
3. D22 sandbox adapter unchanged; **DISPATCH BLOCKED** at ship gates.
4. Operator path: D20 queue → export/handoff; optional D21 blocked-batch audit only.

## Audit preservation

Rollback disables **new** composition mutations and artifact attachment. Existing audit rows for template approval, composition edits, preview renders, and blocked dispatch attachment attempts remain queryable for compliance review.
