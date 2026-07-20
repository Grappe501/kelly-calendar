# KCCC V2.1 — Events Become Missions

**Status:** DELIVERABLE 2 LANDED — Today’s Mission home surface  
**Date:** 2026-07-19 (updated 2026-07-20)  
**Parent:** `KCCC_CAMPAIGN_OPERATING_SYSTEM_V2.md`  
**Google:** PAUSED — no dependency for V2.1  
**Deliverable 1 notes:** `KCCC_V2_1_MISSION_MODEL_DELIVERABLE_1.md` · rollback `KCCC_V2_1_MISSION_MODEL_ROLLBACK.md`  
**Deliverable 2 notes:** `KCCC_V2_1_TODAYS_MISSION_DELIVERABLE_2.md`

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
2. **Mission dashboard** — DONE: `/` is Today’s Mission operating surface (selection + hero + readiness + intelligence + next). Detail at `/system/missions/[missionId]`. Phase workspaces still forthcoming.
3. **Mission lifecycle** — NEXT (start with **Prepare Mode**, not all five stages): briefing, readiness gaps, operator-owned edits, then Execute/Debrief.

Out of scope for V2.1: Google sync, Routes, full War Room, full relationship graph UI, AI briefing engine, AAR analytics platform.

## Constraints

- Never Fake / Unknown
- Architecture 1.0 continuity
- No Google requirement
- Phone-first Execute / Debrief
- Reuse existing Mission Card / day-action surfaces where they already fit
