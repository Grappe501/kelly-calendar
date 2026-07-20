# KCCC V2.1 — Deliverable 1: Mission data model + projection

**Status:** IMPLEMENTED (foundation)  
**Date:** 2026-07-20  
**Parent:** `KCCC_V2_1_EVENTS_BECOME_MISSIONS.md`  
**Projection version:** `v2.1.0`

## Completion gate

```text
Existing Event → Mission Projection → Mission Record → Read API/UI Preview
```

Scheduling behavior on `Event` is unchanged.

## Schema / model decisions

| Decision | Choice |
|----------|--------|
| Storage | New `CampaignMission` table in `kelly_calendar` (1:1 with `Event`) |
| Event rows | Untouched — no scheduling column changes |
| Mission Card (Step 6) | Remains UI projection; V2.1 `CampaignMission` is the durable domain record |
| Incomplete data | Valid `DRAFT` missions (warnings, not failures) |
| Event type | Copied into intelligence as-is — **no silent reclassification** |
| ROI | Always `null` unless later operator-sourced — Never Fake |
| Operator edits | `operatorOwnedFields[]` preserved across backfill |

Enums: `MissionLifecyclePhase`, `MissionOperationalStatus`.

## Projection rules (deterministic)

1. `attendTitle` ← `campaignDisplayTitle` || `internalTitle` || fallback with event number  
2. `objective` ← primary `EventObjective.description` || `desiredOutcome` || typed label || `null`  
3. `successCriteria` ← split `successDefinition` (newlines / bullets / `;`)  
4. `missionStatus` ← Event status + objective completeness (`DRAFT` / `PREPARING` / `READY` / …)  
5. `lifecyclePhase` ← time window + travelRequired + outcome/follow-ups (no Google)  
6. `intelligence` ← county/city/region/orgs/people/objective signals only when present  

## Tooling

```powershell
npm run missions:v21:validate
npm run missions:v21:backfill            # dry-run
$env:KCCC_ALLOW_MISSION_BACKFILL="1"; npm run missions:v21:backfill:apply
```

Migration (additive): `prisma/migrations/20260720020000_v21_campaign_mission`

```powershell
$env:KCCC_ALLOW_SCHEMA_MIGRATION="1"; npm run db:migration:apply
```

## Read surfaces

- UI preview: `/system/missions` (seed examples + field map)
- GET `/api/events/[eventId]/mission`
- POST `/api/events/[eventId]/mission` (persist upsert)
- GET `/api/missions/[missionId]`

## Out of scope (unchanged)

Google, Routes, AI briefing, AAR automation, relationship graph UI, War Room, home → Today’s Mission (Deliverable 2).

## Rollback

See `KCCC_V2_1_MISSION_MODEL_ROLLBACK.md`.
