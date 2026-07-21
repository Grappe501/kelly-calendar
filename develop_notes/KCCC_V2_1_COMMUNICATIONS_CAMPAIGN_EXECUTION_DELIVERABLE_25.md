# KCCC V2.1 — Communications Campaign, Scheduling & Controlled Execution Foundation (Deliverable 25)

**Status:** SHIPPED — campaign execution foundation — **production dispatch remains blocked**  
**Baseline:** D24 `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`  
**Parent stack:** D20 consent · D21 dispatch · D22 provider · D23 composition · D24 audience  
**Next:** D26 controlled live-test authorization & deliverability readiness  
**Validate:** `npm run missions:v21:communications-campaign:validate`  
**Seed:** `npm run missions:v21:communications-campaign:seed`  
**Production dispatch:** **DISPATCH BLOCKED**

## Governing rule

```text
A campaign may organize execution.
It may never override dispatch eligibility.
```

## Canonical flow

```text
Approved composition + approved recipient manifest
        ↓
Communication campaign (exact revision)
        ↓
Execution plan (MANUAL_SANDBOX | SCHEDULED_SANDBOX only)
        ↓
Launch readiness → Authorize sandbox launch
        ↓
Bounded run → batch → D21 preflight per attempt → D22 (blocked in D25)
```

## Enabled modes

| Mode | D25 |
|------|-----|
| `MANUAL_SANDBOX` | Enabled (primary) |
| `SCHEDULED_SANDBOX` | Enabled (bounded, authenticated ingress) |
| `CONTROLLED_LIVE_TEST` | Schema/UI placeholder — **unavailable** |
| `PRODUCTION` | **Hard blocked** |

## Workspace

- `/system/communications/campaigns`
- `/system/communications/campaigns/[campaignId]`

Primary operator path: **Prepare next batch → Run preflight → Dispatch sandbox batch** (dispatch records blocked outcome; zero production provider requests).

## Acceptance

- [x] Campaigns bind exact composition revision + recipient manifest  
- [x] Revisions immutable after approval; edits require new revision  
- [x] Timezone-aware schedule validation; blackouts enforced  
- [x] Readiness binds exact hashes; authorization bounded + sandbox-only  
- [x] Deterministic batches; D21 preflight per planned attempt  
- [x] Pause / resume (revalidated) / cancel  
- [x] Retries classified; operator approval required by default  
- [x] Accepted ≠ delivered; completion preserves unknown  
- [x] No durable autonomous queue; scheduled ingress fail-closed  
- [x] Zero production messages  

## Recommended D26

Controlled live-test authorization & deliverability readiness — still not general production launch.
