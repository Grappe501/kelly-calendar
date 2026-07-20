# KCCC V2.1 — Deliverable 3: Prepare Mode

**Status:** IMPLEMENTED  
**Date:** 2026-07-20  
**Parent:** `KCCC_V2_1_EVENTS_BECOME_MISSIONS.md`  
**Baseline:** Deliverable 2 `e1e0a56`

## Product purpose

Prepare Mode is the first interactive mission workspace — the real destination for **Open Mission Brief**. Operators turn a projected Mission into a human-owned briefing before travel/execute. Not an AI briefing engine.

## Routes

| Route | Role |
|-------|------|
| `/system/missions/[missionId]/prepare` | Canonical Prepare workspace |
| `/system/missions/[missionId]?mode=prepare` | Redirects to `/prepare` |
| `/system/missions/[missionId]` | Full mission record (+ Open Prepare Mode) |
| `/` | Today’s Mission — CTA → `/prepare` when phase is PREPARE |

## Data model

Additive `MissionPreparation` (1:1 with `CampaignMission`), enum `MissionPreparationReadiness` (`DRAFT` \| `NEEDS_ATTENTION` \| `READY`).

- Lazy create on first PATCH (existing 37 missions get no fabricated rows).
- Cascade delete with CampaignMission only.
- Never stores Event schedule fields.

Migration: `prisma/migrations/20260720040000_v21_mission_preparation`

## Projected vs operator-owned

| Source | Label | Examples |
|--------|-------|----------|
| Event → Mission projection | **Projected · From Event** | title, time, location, objective, criteria, people/orgs, travel |
| MissionPreparation | **Campaign Brief** | strategic purpose, key message, talking points, logistics adds, tasks, notes |

Reprojection updates `CampaignMission` only. Preparation rows are untouched.

## Persistence

- Section-level Save via `PATCH /api/missions/[missionId]/preparation`
- GET returns workspace view (lazy empty until first save)
- Validated merge preserves untouched sections

## Readiness

Separate from lifecycle phase and operational status. Operator must **Mark Brief Ready**. Checklist never auto-sets READY. No LOCKED state in this slice.

## Tasks

Mission-scoped checklist only. No notifications, no Google sync, no auto-insert of starter tasks.

## Security

System leadership gate (`KELLY` / `CAMPAIGN_MANAGER`) + `EVENT_VIEW` / `EVENT_EDIT` on linked Event. `robots: noindex`. Not public.

## Known limitations

- No full CRM contact picker (mission-scoped briefing entries)
- No historical version ledger (timestamps + actor ids only)
- People/org UI uses structured text blocks (mobile-friendly)
- Travel / Execute / Debrief / Follow-up workspaces still forthcoming

## Deferred AI

Future AI may assist this structured workspace — never invent political claims here.

## Recommended Deliverable 4

**Execute Mode** — narrow event-time mobile surface: arrival, objective, key message, people to find, live observations, commitments, immediate follow-up capture.
