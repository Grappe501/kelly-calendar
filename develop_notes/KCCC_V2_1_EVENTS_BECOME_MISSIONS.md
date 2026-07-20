# KCCC V2.1 — Events Become Missions

**Status:** DELIVERABLE 9 LANDED — Campaign Day Closeout  
**Date:** 2026-07-19 (updated 2026-07-20)  
**Parent:** `KCCC_CAMPAIGN_OPERATING_SYSTEM_V2.md`  
**Google:** PAUSED — no dependency for V2.1  
**Deliverable 1 notes:** `KCCC_V2_1_MISSION_MODEL_DELIVERABLE_1.md` · rollback `KCCC_V2_1_MISSION_MODEL_ROLLBACK.md`  
**Deliverable 2 notes:** `KCCC_V2_1_TODAYS_MISSION_DELIVERABLE_2.md`  
**Deliverable 3 notes:** `KCCC_V2_1_PREPARE_MODE_DELIVERABLE_3.md` · rollback `KCCC_V2_1_PREPARE_MODE_ROLLBACK.md`  
**Deliverable 4 notes:** `KCCC_V2_1_EXECUTE_MODE_DELIVERABLE_4.md` · rollback `KCCC_V2_1_EXECUTE_MODE_ROLLBACK.md`  
**Deliverable 5 notes:** `KCCC_V2_1_DEBRIEF_MODE_DELIVERABLE_5.md` · rollback `KCCC_V2_1_DEBRIEF_MODE_ROLLBACK.md`  
**Deliverable 6 notes:** `KCCC_V2_1_FOLLOW_UP_MODE_DELIVERABLE_6.md` · rollback `KCCC_V2_1_FOLLOW_UP_MODE_ROLLBACK.md`  
**Deliverable 7 notes:** `KCCC_V2_1_MISSION_COMMAND_CENTER_DELIVERABLE_7.md` · rollback `KCCC_V2_1_MISSION_COMMAND_CENTER_ROLLBACK.md`  
**Deliverable 8 notes:** `KCCC_V2_1_CAMPAIGN_DAY_BRIEFING_DELIVERABLE_8.md` · rollback `KCCC_V2_1_CAMPAIGN_DAY_BRIEFING_ROLLBACK.md`  
**Deliverable 9 notes:** `KCCC_V2_1_CAMPAIGN_DAY_CLOSEOUT_DELIVERABLE_9.md` · rollback `KCCC_V2_1_CAMPAIGN_DAY_CLOSEOUT_ROLLBACK.md`

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
6. **Campaign Day Closeout** — DONE: `/system/briefing/closeout` and `/system/briefing/[date]/closeout` evening review + tomorrow readiness + leadership signoff. NEXT recommended: **Briefing acknowledgement + optional morning snapshot** (still no AI / no automated delivery).

Out of scope for V2.1: Google sync, Routes, full War Room, full relationship graph UI, AI briefing engine, AAR analytics platform.

## Constraints

- Never Fake / Unknown
- Architecture 1.0 continuity
- No Google requirement
- Phone-first Execute / Debrief
- Reuse existing Mission Card / day-action surfaces where they already fit
