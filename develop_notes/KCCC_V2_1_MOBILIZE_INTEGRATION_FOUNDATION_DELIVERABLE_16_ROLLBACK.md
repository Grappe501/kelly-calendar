# KCCC V2.1 — Deliverable 16 Rollback

**Companion:** `KCCC_V2_1_MOBILIZE_INTEGRATION_FOUNDATION_DELIVERABLE_16.md`

## Safe application rollback

1. Revert D16 feature/docs commits on `main` or redeploy prior Netlify deploy.
2. Remove Mobilize nav links if reverting UI only.
3. Disable adapter by unsetting Netlify env vars (`MOBILIZE_API_KEY`, `MOBILIZE_ORGANIZATION_ID`) via Netlify UI — do not paste keys into chat/logs.
4. Leave `ExternalSyncRun` / `ExternalSyncCandidate` / `ExternalObjectReference` rows in place for audit unless Steve explicitly approves destructive SQL.
5. Stop in-progress runs by not starting new dry-runs; mark FAILED only via code paths if needed.

## Do not

- Automate DROP TABLE / DELETE of Missions, Events, or operational history.
- Delete imported local Events that operators may rely on.
- Force-push `main` without approval.
- Fabricate a “successful disconnect” that erases audit history.

## Restore D15

D15 Exception Digest has no runtime dependency on Mobilize. Unsetting Mobilize env restores `NOT_CONFIGURED` and D15 continues unchanged.
