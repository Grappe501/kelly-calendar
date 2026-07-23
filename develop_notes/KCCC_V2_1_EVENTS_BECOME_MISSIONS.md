# KCCC V2.1 — Events Become Missions

**Status:** DELIVERABLE 20 READY — Campaign Communications and Mobilization Queue  
**Date:** 2026-07-19 (updated 2026-07-20)  
**Parent:** `KCCC_CAMPAIGN_OPERATING_SYSTEM_V2.md`  
**Google:** PAUSED — no dependency for V2.1  
**Mobilize:** D18 attendance read — `KCCC_V2_1_MOBILIZE_SIGNUP_ATTENDANCE_READ_DELIVERABLE_18.md` · D17 publishing · D16 foundation · architecture `KCCC_V2_1_PROVIDER_INTEGRATION_MOBILIZE_ARCHITECTURE.md`  
**Authority:** Event→Mission remains explicit. Mobilize signup/attendance never advances Execute or creates Missions. Person-level apply disabled pending consent-aware Person authority.
**Calendar Completion:** CC-01/CC-02/CC-03/CC-04 do not create or mutate Missions automatically. CC-04 materializes recurring Event occurrences only; Mission conversion remains explicit. CC-02 may *report* Mission-boundary anomalies but never repairs Mission data. CC-03 hardens Event time semantics. **CC-10** ICS export/subscription is read-only: it never creates or mutates Missions, and Mission operational notes are excluded from all privacy profiles. **CC-11** health (ADR-099) observes calendar/Mission-boundary signals only — it never creates, advances, or cancels Missions.
**Deliverable 1 notes:** `KCCC_V2_1_MISSION_MODEL_DELIVERABLE_1.md` · rollback `KCCC_V2_1_MISSION_MODEL_ROLLBACK.md`  
**Deliverable 2 notes:** `KCCC_V2_1_TODAYS_MISSION_DELIVERABLE_2.md`  
**Deliverable 3 notes:** `KCCC_V2_1_PREPARE_MODE_DELIVERABLE_3.md` · rollback `KCCC_V2_1_PREPARE_MODE_ROLLBACK.md`  
**Deliverable 4 notes:** `KCCC_V2_1_EXECUTE_MODE_DELIVERABLE_4.md` · rollback `KCCC_V2_1_EXECUTE_MODE_ROLLBACK.md`  
**Deliverable 5 notes:** `KCCC_V2_1_DEBRIEF_MODE_DELIVERABLE_5.md` · rollback `KCCC_V2_1_DEBRIEF_MODE_ROLLBACK.md`  
**Deliverable 6 notes:** `KCCC_V2_1_FOLLOW_UP_MODE_DELIVERABLE_6.md` · rollback `KCCC_V2_1_FOLLOW_UP_MODE_ROLLBACK.md`  
**Deliverable 7 notes:** `KCCC_V2_1_MISSION_COMMAND_CENTER_DELIVERABLE_7.md` · rollback `KCCC_V2_1_MISSION_COMMAND_CENTER_ROLLBACK.md`  
**Deliverable 8 notes:** `KCCC_V2_1_CAMPAIGN_DAY_BRIEFING_DELIVERABLE_8.md` · rollback `KCCC_V2_1_CAMPAIGN_DAY_BRIEFING_ROLLBACK.md`  
**Deliverable 9 notes:** `KCCC_V2_1_CAMPAIGN_DAY_CLOSEOUT_DELIVERABLE_9.md` · rollback `KCCC_V2_1_CAMPAIGN_DAY_CLOSEOUT_ROLLBACK.md`  
**Deliverable 10 notes:** `KCCC_V2_1_MORNING_LAUNCH_REVIEW_DELIVERABLE_10.md` · rollback `KCCC_V2_1_MORNING_LAUNCH_REVIEW_ROLLBACK.md`  
**Deliverable 11 notes:** `KCCC_V2_1_TRAVEL_MOVEMENT_OPERATIONS_DELIVERABLE_11.md` · rollback `KCCC_V2_1_TRAVEL_MOVEMENT_OPERATIONS_ROLLBACK.md`  
**Deliverable 12 notes:** `KCCC_V2_1_MISSION_LOGISTICS_PACK_DELIVERABLE_12.md` · rollback `KCCC_V2_1_MISSION_LOGISTICS_PACK_DELIVERABLE_12_ROLLBACK.md`  
**Deliverable 13 notes:** `KCCC_V2_1_FIELD_DAY_OPERATIONS_DELIVERABLE_13.md` · rollback `KCCC_V2_1_FIELD_DAY_OPERATIONS_DELIVERABLE_13_ROLLBACK.md`  
**Deliverable 14 notes:** `KCCC_V2_1_MISSION_INCIDENT_LOG_DELIVERABLE_14.md` · rollback `KCCC_V2_1_MISSION_INCIDENT_LOG_DELIVERABLE_14_ROLLBACK.md`  
**Deliverable 15 notes:** `KCCC_V2_1_CAMPAIGN_DAY_EXCEPTION_DIGEST_DELIVERABLE_15.md` · rollback `KCCC_V2_1_CAMPAIGN_DAY_EXCEPTION_DIGEST_DELIVERABLE_15_ROLLBACK.md`  
**Deliverable 16 notes:** `KCCC_V2_1_MOBILIZE_INTEGRATION_FOUNDATION_DELIVERABLE_16.md` · rollback `KCCC_V2_1_MOBILIZE_INTEGRATION_FOUNDATION_DELIVERABLE_16_ROLLBACK.md`

## Product shift

Calendar events stop being time blocks. They become **missions** with measurable purpose and a lifecycle.

Today:

```text
July 24
Cave City Watermelon Festival
10:00 AM
```

V2.1:

```text
MISSION
Attend: Cave City Watermelon Festival
Objective: Increase name recognition in Sharp County
Success criteria: Meet Mayor · Chamber booth · local media · 15 volunteers · 40 contacts
Status: Preparing
```

## Five lifecycle phases

| Phase | Job |
|-------|-----|
| **Prepare** | Before leave: literature, signs, talking points, briefing, weather, hotel, fuel, volunteers |
| **Travel** | Leave / arrive / stops / fuel / lunch / hotel / rest — **never Google-dependent** |
| **Execute** | During event: people, media, volunteers, donors, questions, photos, expenses — phone-first |
| **Debrief** | Immediate 6 questions (~30s): went well, problems, promises, follow-up, media, score |
| **Follow-up** | Auto-creates work: email, call, photos, thank-you, next visit, county lead |

## Mission intelligence object (knowledge graph seed)

County · City · Region · Organizations · Churches · Businesses · Officials · Media · Schools · Target voters · Issues · Fundraising · Volunteer · Petitions · Press · Opposition · Priority · Expected ROI

Not freeform notes only — structured campaign intelligence.

## Home screen

One primary object: **Today's Mission** (countdown, weather, prepare / travel / execute / follow-up). Calendar becomes secondary navigation (Tomorrow / Next Week), not the hero.

## AI companion (later; no Google)

Advice from **own campaign data only** (prior visits, promises, relationships, turnout trends). Never invent facts.

## Mission timeline UI

Horizontal phase bar: Prepare → Travel → Execute → Follow-up → Complete (progress + current phase).

---

## V2.1 deliverables (ONLY)

1. **Mission data model** — DONE: `CampaignMission` + deterministic Event→Mission projection + backfill + mission APIs.
2. **Mission dashboard** — DONE: `/` is Today’s Mission operating surface. Detail at `/system/missions/[missionId]`.
3. **Mission lifecycle** — Prepare / Execute / Debrief / Follow-up DONE.  
4. **Mission Command Center** — DONE: `/system/missions/command-center` cross-Mission operating view (read-only aggregation).  
5. **Campaign Day Briefing** — DONE: `/system/briefing/today` and `/system/briefing/[date]` deterministic daily operating packet.  
6. **Campaign Day Closeout** — DONE: `/system/briefing/closeout` and `/system/briefing/[date]/closeout` evening review + tomorrow readiness + leadership signoff.  
7. **Morning Launch Review** — DONE: `/system/briefing/launch` and `/system/briefing/[date]/launch` start-of-day confirmation + launch authorization (does not start Mission execution).  
8. **Travel and Movement Operations** — DONE: Mission travel plans/legs + day movement board (manual data only; no external routing).  
9. **Mission Logistics Pack / Field Kit** — DONE: Mission logistics packs/items/handoffs + day logistics board (manual data only; no inventory system).
10. **Field Day Operations / Live Kit Confirmation** — DONE: on-site confirmation against D12 items during Execute context (independent state machines).
11. **Mission Exception / Incident Log** — DONE: structured live incident capture with carry-forward and soft Follow-up link (not emergency dispatch).
12. **Campaign Day Exception Digest** — DONE: read-oriented day rollup for Closeout + next-day Launch with optional review metadata + Mobilize-ready external reference foundation.
13. **Mobilize Integration Foundation** — READY: server-only adapter, capability discovery, dry-run reconciliation, external identity mapping; outbound publishing disabled. NEXT recommended: **Mobilize Event Publishing and Bidirectional Reconciliation**.
14. **Volunteer Staffing and Assignment Reconciliation (D19)** — DONE: Mission role requirements, explicit assignments, coverage gaps, D18 RSVP availability context (read-only), cancellation reconciliation signals, day-of staffing confirmation. Does not mutate Prepare/Execute/Debrief/Follow-up/Travel/Logistics/Field Ops/Launch/Closeout. RSVP ≠ assignment.
15. **Campaign Communications and Mobilization Queue (D20)** — Consent-aware policy, contact points, evidence, suppressions, audience review, dual approval, queue prepare, export, manual handoff. External send disabled; Mobilize links in content only. RSVP/attendance/staffing/check-in ≠ consent.
16. **Communications Provider Dispatch Foundation (D21)** — Provider registry, kill switches, bounded batches, webhook ingress, dispatch preflight. No production provider selected; kill switches default ON; no durable background queue. NEXT recommended: **Communications Provider Selection and Sandbox Adapter**.

Out of scope for V2.1: Google sync, Routes, full War Room, full relationship graph UI, AI briefing engine, AAR analytics platform, live production email/SMS dispatch (D22+ after provider selection).

## Constraints

- Never Fake / Unknown
- Architecture 1.0 continuity
- No Google requirement
- Phone-first Execute / Debrief
- Reuse existing Mission Card / day-action surfaces where they already fit
