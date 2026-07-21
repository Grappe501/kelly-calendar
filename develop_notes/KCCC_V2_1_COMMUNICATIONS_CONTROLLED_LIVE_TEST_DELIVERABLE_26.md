# KCCC V2.1 — Communications Controlled Live-Test Authorization & Deliverability Readiness (Deliverable 26)

**Status:** SHIPPED — controlled live-test foundation — **general production dispatch remains blocked**  
**Git:** `main` @ `0478fc1`  
**Netlify:** deploy `6a5f11de20c00cded0749c3a` · https://kelly-calendar.netlify.app  
**Baseline:** D25 `KCCC_V2_1_COMMUNICATIONS_CAMPAIGN_EXECUTION_DELIVERABLE_25.md`  
**Parent stack:** D20 consent · D21 dispatch · D22 provider · D23 composition · D24 audience · D25 campaigns  
**Next:** Engineering Gate **LG-1** — operate from `KCCC_V2_1_LG_1_CONTROLLED_LIVE_TEST_OPERATOR_RUNBOOK.md` and `KCCC_V2_1_LG_1_EVIDENCE_CHECKLIST.md`. Do not start D27 production-governance code until LG-1 is complete.  
**Validate:** `npm run missions:v21:communications-live-test:validate` (309 tests D1–D26)  
**Seed:** `npm run missions:v21:communications-live-test:seed` (draft programs only; approved recipients = 0; active authorizations = 0)  
**Production dispatch:** **DISPATCH BLOCKED**  
**Milestone:** `KCCC-V2.1-COMMS-CORE-COMPLETE`

## Governing rule

```text
D26 authorizes a specific test,
not a production communications capability.
```

## Canonical separation

```text
D25: Sandbox campaign execution framework
D26: One-time controlled real-world verification path
```

D26 sits **beside** D25. It does not convert D25 campaigns into production mode and does not activate `CONTROLLED_LIVE_TEST` broadly inside ordinary campaigns.

## Canonical flow

```text
ControlledLiveTest
  → Provider readiness (LIVE_TEST_READY only)
  → Sender + domain verification
  → Recipient consent + allowlist (max 1)
  → Exact artifact binding
  → Readiness review
  → One-time authorization (typed: AUTHORIZE ONE LIVE TEST)
  → Manual launch (typed: SEND ONE CONTROLLED TEST)
  → D21 eligibility preflight
  → Atomic authorization consumption
  → Wire blocked by production kill switches (foundation)
  → Post-test safety verification (production remains blocked)
```

## Shipped defaults (hard)

| Limit | Value |
|-------|-------|
| Maximum recipients | 1 |
| Maximum attempts | 1 |
| Maximum provider requests | 1 |
| Manual launch only | true |
| Retries allowed | false |
| Scheduled live launch | prohibited |
| Audience-manifest live launch | prohibited |
| General production permission | not introduced |

## Foundation ship behavior

This deliverable ships the governed authorization path end-to-end.

- Live wire submission remains blocked by production kill switches and the D26 hard block.
- When eligibility passes, the one-time authorization is **consumed atomically** even if the wire call is withheld, preventing duplicate-send risk on uncertain futures.
- Post-test safety verification records that general production dispatch, D25 production mode, scheduled production ingress, and audience live dispatch remain blocked.
- A future ops-approved live wire send requires verified production credentials, intentional kill-switch policy for that one test, and completed post-test review — still without enabling general production campaigns.

## Workspace

- `/system/communications/live-tests`
- `/system/communications/live-tests/[programId]`

Do not treat this UI as a campaign-send workflow.

## Migration

`20260721140000_v21_communications_controlled_live_test`

## Acceptance (foundation)

- [x] Controlled live-test programs + immutable revisions after approval  
- [x] Provider may be marked `LIVE_TEST_READY` only (not general production)  
- [x] Sender / domain / webhook readiness checks recorded without secrets  
- [x] One approved recipient max; ownership + consent scope `COMMUNICATIONS_CONTROLLED_LIVE_TEST`  
- [x] Exact artifact / destination / provider binding on one-time authorization  
- [x] Defaults: 1 recipient, 1 attempt, 1 provider request; retries off; manual only  
- [x] Typed confirmation phrases required  
- [x] Scheduled / audience / public launch impossible  
- [x] Atomic consumption + post-test production-block verification  
- [x] Emergency stop + incidents + post-test review  
- [x] No `communications.production.send` permission  
- [x] D1–D26 validate green; TypeScript/build/secret scan  
- [x] Git + Netlify verified; rollback documented  

## Recommended D27 (after LG-1 only)

Do **not** begin D27 implementation until Engineering Gate LG-1 completes one real controlled live communication and post-test review. See `KCCC_V2_1_COMMUNICATIONS_OS_CORE_COMPLETE.md`.

D27 should be policy-driven: authorization ladder, send limits, reputation/complaint thresholds, frequency caps, approval workflows, incident response, and progressive expansion — not another infrastructure foundation.
