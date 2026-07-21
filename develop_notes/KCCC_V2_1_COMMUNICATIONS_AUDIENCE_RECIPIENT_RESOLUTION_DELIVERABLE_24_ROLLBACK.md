# D24 Rollback — Communications Audience, Segmentation & Recipient Resolution Foundation

**Companion:** `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`

## Principle

Disable audience mutations, manifest materialization, and manifest-backed queue attachment; **preserve** audience definitions, manifest snapshots, and audit history. Rollback must not imply messages were sent, erase approval evidence, or re-enable production dispatch.

D24 rollback does **not** weaken D20 consent doctrine or open D21/D22 production gates.

## Immediate disable (no deploy required)

1. **Leave D21 kill switches ON** and D20 `externalDispatchEnabled: false` — production remains **DISPATCH BLOCKED**.
2. **Disable D24 audience API mutations** at route layer if investigating incidents (return feature-disabled or 503 as implemented).
3. **Do not** approve new audience manifests or audience approvals during rollback investigation.
4. **Preserve** all `CommunicationRecipientManifest` and manifest entry rows — invalidate only through documented operator action, not bulk delete.
5. **Fall back** to D20-only audience materialization (legacy explicit sources) when D24 paths disabled.

## Code rollback (if reverting D24 commit)

1. Confirm D20 queue prepare still works with D20-native audience members (pre-D24 path).
2. Confirm D23 dispatch artifacts still block or operate without manifest requirement per pre-D24 behavior.
3. Disable audience definition workspace routes and D24 service entry points.
4. Revert D24 feature commit; redeploy.
5. Re-run validation suites:

```bash
npm run missions:v21:communications:validate
npm run missions:v21:communications-composition:validate
npm run missions:v21:communications-dispatch:validate
npm run typecheck
```

6. Confirm D20 export/handoff and D21 blocked-batch audit behavior unchanged.

## Migration rollback (exceptional)

D24 adds additive tables (audience definitions, versions, criteria applications, candidates, manifests, entries, audience approvals). **Do not** drop tables routinely.

Revert migration only when:

- D24 tables unused or sandbox-only with zero queue attachments, **or**
- Full DB backup taken and Steve authorized schema rollback

| Table | Rollback impact |
|-------|-----------------|
| `CommunicationAudienceDefinition` | Preserve; archive if reverting UI |
| `CommunicationAudienceDefinitionVersion` | Preserve criteria history |
| `CommunicationSegmentCriteriaApplication` | Preserve audit |
| `CommunicationRecipientCandidate` | Preserve or archive stale candidates |
| `CommunicationRecipientManifest` | **Preserve** — queue audit may reference |
| `CommunicationRecipientManifestEntry` | **Preserve** |
| `CommunicationAudienceApproval` | Preserve |

## Queue and manifest integration rollback

If D24 extended D20 queue prepare with manifest fingerprints:

1. Stop accepting new manifest-backed prepare paths.
2. In-flight communications with manifest approvals: preserve rows; mark audience approval `STALE` if criteria cannot be recomputed.
3. Queue prepare falls back to D20 audience member snapshots only — never send from partial manifest.
4. D23 `recipientFingerprint` attachment disabled — preflight blocks mismatch or uses legacy path.

## Do not

- Bulk-delete manifests, manifest entries, or audience approvals during rollback
- Fabricate delivery events or queue `DISPATCHED` status to “clear” audience work
- Use real voter contacts for rollback testing previews
- Present **FABRICATED TEST DATA** as real recipient proof
- Enable production dispatch “to verify audience rollback”
- Import CSV/SQL audience lists as emergency workaround (violates prohibited segmentation policy)
- Store rollback secrets in repo or tickets
- Force-push `main` without approval
- Drop D20 consent, suppression, queue, or D21 dispatch tables

## Restore prior state (D23-only audience path)

1. D20 explicit-source audience materialization remains operational (`STAFFING_ASSIGNMENTS`, `CAMPAIGN_USERS`, `MANUAL`, `CONSENT_CONTACTS`).
2. D20 audience approval and queue prepare use D20-native fingerprints without manifest contract.
3. D23 composition and fabricated preview unchanged; **DISPATCH BLOCKED** at ship gates.
4. Operator path: D20 audience review → approvals → queue → export/handoff; optional D21 blocked-batch audit only.

## Audit preservation

Rollback disables **new** audience definition edits, manifest materialization, and manifest-backed prepare. Existing audit rows for segment applications, inclusion decisions, manifest approvals, and blocked dispatch attachment attempts remain queryable for compliance review.
