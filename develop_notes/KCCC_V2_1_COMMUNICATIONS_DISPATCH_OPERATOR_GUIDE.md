# KCCC — Communications dispatch operator guide (D21)

**Scope:** Provider dispatch foundation on top of D20 queue  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_DISPATCH_FOUNDATION_DELIVERABLE_21.md`

## Principles

1. **Provider acceptance ≠ delivery.** Delivery ≠ engagement.
2. D21 ship state: **production dispatch disabled** — no provider selected, kill switches ON.
3. Complete D20 workflow first: policy → draft → audience → approvals → queue prepare.
4. **Export and handoff remain valid** when provider dispatch is unavailable.
5. Kill-switch control row is created only on **intentional** leadership admin load — not on casual page views.
6. Batches are **bounded** (max 25 items) — no background worker drains the queue.
7. Never infer consent; never bypass suppression for dispatch.

## Who

Campaign leadership roles (full calendar access) for provider dashboard, kill switches, preflight, bounded batch attempts, dispatch history, webhook history, and unknown reconciliation.

## Before first use

1. Apply D21 migration when schema not yet present:

```bash
KCCC_ALLOW_SCHEMA_MIGRATION=1 node scripts/apply-communications-dispatch-migration.mjs
```

2. Run validation:

```bash
npm run missions:v21:communications-dispatch:validate
npm run typecheck
```

3. Expect **zero** D21 rows until intentional admin actions (except default kill-switch row after first controls/dashboard load).

## Workflow — D20 prerequisites (unchanged)

Follow `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md`:

1. Seed policy (conservative defaults).
2. Draft communication with channel + purpose.
3. Materialize and review audience; record consent evidence and suppressions.
4. Obtain **content**, **audience**, and **dispatch** approvals.
5. Queue prepare — items in `PREPARED` status.

## Workflow — Provider dashboard

1. Open provider dashboard (leadership only) — triggers `ensureDefaultDispatchControl` if no control row exists.
2. Review:
   - Selected provider key (expect **null** at D21 ship)
   - Active adapter (`disabled`)
   - Kill switch state (expect all **ON**)
   - Registered providers list (no selectable vendor at ship)
3. Do not expect credentials or secrets in API responses.

## Workflow — Verify connection (future vendor)

When D22 registers a vendor:

1. Configure env secrets in Netlify (never in repo or chat).
2. Run verify from leadership UI.
3. Connection saves with `applicationDispatchEnabled: false` until explicit enablement.
4. Credential-tested ≠ production-ready.

## Workflow — Kill switches

| Switch | Blocks |
|--------|--------|
| Global | All dispatch |
| Email | EMAIL channel only |
| SMS | SMS channel only |

Defaults: all **ON**. Turning a switch **OFF** requires explicit `false` in control update plus **reason** string (audited).

Re-enabling a switch (turning ON) does **not** resume interrupted batches — create a new batch after gates open.

## Workflow — Dispatch preflight

1. Select a communication in `QUEUED` state with `PREPARED` items.
2. Run preflight — reviews each prepared queue item against:
   - Content, audience, dispatch approvals
   - Policy `externalDispatchEnabled`
   - Provider mode and application dispatch flag
   - Kill switches
   - Contact, consent, suppression (from D20 facts)
   - Open unknown outcomes on prior attempts
3. Review `eligibleCount`, `blockedCount`, and `sampleBlockingReasons`.
4. At D21 ship, expect `dispatchAvailable: false` and blocking reasons including `POLICY_EXTERNAL_DISPATCH_DISABLED`, `PROVIDER_DISPATCH_DISABLED`, and kill switch codes.

## Workflow — Bounded batch (D21 ship behavior)

1. Operator initiates batch from preflight UI.
2. System creates `CommunicationDispatchBatch` with status **`BLOCKED`** — audit only.
3. **Zero** provider requests at ship.
4. When gates open in a future pass:
   - Max 25 items per batch
   - Kill switches re-checked between items
   - Idempotent attempts per queue item + fingerprints

## Workflow — Dispatch history

1. List batches with status, counts (accepted/rejected/unknown/blocked).
2. Open batch detail for attempt statuses — **no destinations or message bodies** in API.
3. `PROVIDER_ACCEPTED` means vendor accepted the request — not inbox delivery.

## Workflow — Unknown outcomes

1. If an attempt lands in `UNKNOWN_OUTCOME` (e.g. timeout after possible send), **do not blind retry**.
2. Run reconcile when vendor supports lookup by idempotency key or message ID.
3. Resolve to `PROVIDER_ACCEPTED` or leave reconciliation pending.
4. Open unknowns block new dispatch for that queue item (`UNKNOWN_OUTCOME_OPEN`).

## Workflow — Webhooks

Provider webhooks are processed server-side. Operators review webhook history (signature valid, processing status, match count).

See `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_SECURITY.md`.

Verified complaint/opt-out/bounce events may create D20 suppressions — suppressions win on future preflight.

## Workflow — Export / handoff (still allowed)

When dispatch is disabled, use D20 paths:

- **Export** — CSV of prepared items; status `EXPORTED`; not delivery proof.
- **Handoff** — manual transfer label; status `HANDED_OFF`; not delivery proof.

## Validation after changes

```bash
npm run missions:v21:communications-dispatch:validate
```

## Do not

- Enable production dispatch without completing production-readiness checklist.
- Set `kccc-test` as production provider key.
- Treat batch `COMPLETED` or attempt `PROVIDER_ACCEPTED` as delivered.
- Retry unknown outcomes without reconciliation.
- Disable kill switches without documented reason and leadership authorization.
- Send through Mobilize API.

## Related docs

- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_SELECTION_GUIDE.md`
- `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md`
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_DISPATCH_FOUNDATION_DELIVERABLE_21_ROLLBACK.md`
