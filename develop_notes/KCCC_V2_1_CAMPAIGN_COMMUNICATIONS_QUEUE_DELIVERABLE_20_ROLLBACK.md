# D20 Rollback — Campaign Communications and Mobilization Queue

1. Disable communications service mutations at the API/feature layer (return 503 or feature-disabled as implemented).
2. Remove navigation links to communications workspaces when present.
3. **Preserve** all `CampaignCommunicationPolicy`, `CampaignContactPoint`, `CampaignCommunicationConsentEvidence`, `CampaignCommunicationSuppression`, `CampaignCommunication`, audience, approval, queue, and delivery event history plus attributed audit rows.
4. Do **not** auto-export or bulk-delete contact destinations, consent evidence, or suppression records; anonymize only under operator policy.
5. Do **not** automate destructive database rollback of D20 tables while operational history exists.
6. Manual DB rollback of D20 schema only when tables are unused, backed up, and explicitly authorized — never as part of routine deploy rollback.
7. Restore D19 staffing and D18 Mobilize read behavior unchanged; staffing assignments and observations remain available for future comms re-enable.
8. Person/attendance **writes** to Mobilize remain disabled (unchanged from D17/D18).
9. Revert feature commit if needed after mutations are disabled; do not delete comms rows as part of git revert.
10. Confirm `externalDispatchEnabled` remains false and `DisabledCommunicationProviderAdapter` is active — no accidental provider sends after rollback.

**Principle:** Disable surfaces and writes; keep consent, suppression, and queue history. Communications decisions and evidence are operator-owned — rollback must not silently erase them or imply messages were delivered.
