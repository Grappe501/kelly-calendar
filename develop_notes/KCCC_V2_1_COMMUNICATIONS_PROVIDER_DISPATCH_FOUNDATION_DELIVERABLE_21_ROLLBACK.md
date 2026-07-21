# D21 Rollback — Communications Provider Dispatch Foundation

**Companion:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_DISPATCH_FOUNDATION_DELIVERABLE_21.md`

## Safe application rollback

1. Set all kill switches ON via dispatch controls (or leave defaults) — blocks new provider requests immediately.
2. Unset `KCCC_COMMUNICATIONS_PROVIDER_KEY` in Netlify/env — active adapter returns to `disabled`.
3. Disable dispatch service mutations at the API/feature layer if reverting code (return 503 or feature-disabled as implemented).
4. Remove navigation links to dispatch admin surfaces when present.
5. **Preserve** all `CommunicationProviderConnection`, `CommunicationDispatchControl`, `CommunicationDispatchBatch`, `CommunicationDispatchAttempt`, `CommunicationWebhookReceipt`, D20 comms history, and attributed audit rows.
6. Do **not** auto-retry open `UNKNOWN_OUTCOME` attempts after rollback — reconcile or cancel explicitly.
7. Do **not** bulk-delete webhook receipts while dispute or compliance review may reference them.
8. Revert feature commit if needed after mutations are disabled; do not delete dispatch rows as part of git revert.
9. Confirm D20 export/handoff path still works with `DisabledCommunicationProviderAdapter`.
10. Confirm test adapter cannot run in production after redeploy.

## Do not

- Automate DROP TABLE / DELETE of dispatch tables while operational or audit history exists.
- Delete D20 consent, suppression, or queue history as part of D21 rollback.
- Force-push `main` without approval.
- Fabricate delivery events to “close out” batches after rollback.
- Re-enable kill switches without documented reason when investigating incidents.

## Restore D20

D20 communications queue, export, and handoff have no runtime dependency on D21 dispatch tables. With provider key unset and kill switches ON, D20 continues unchanged — export and manual handoff remain the only outbound paths.

## Database rollback (exceptional)

Manual schema rollback of D21 tables only when:

- Tables are unused (zero batches/attempts/receipts or explicitly archived),
- Full backup taken and authorized by Steve,
- D20 comms rows unaffected,
- Never as part of routine deploy rollback.

## Principle

Disable surfaces, env selection, and provider requests; keep batch, attempt, webhook, and control history. Dispatch audit is operator- and provider-owned — rollback must not silently erase attempts or imply messages were delivered.
