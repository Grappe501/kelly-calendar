# KCCC V2.1 — Deliverable 7: Mission Command Center

**Status:** LANDED  
**Date:** 2026-07-20  
**Route:** `/system/missions/command-center`  
**Baseline:** Follow-up Mode (Deliverable 6)

## Product purpose

The Mission Command Center is the campaign’s cross-Mission operational control surface. It answers what is active, what is next, and where leadership attention is required — without replacing Today’s Mission (`/`), the calendar, or phase workspaces.

**Governing principle:** Aggregate here. Operate in the owning workspace.

## Audience and authorization

Primary audience: campaign manager, candidate, senior leadership, authorized operations staff.

Access uses `requireSystemAdminPage` (same high-trust boundary as other `/system/missions/*` surfaces). Page is `force-dynamic` with `robots: noindex`. No public static exposure of Mission content.

## Data sources

Read-only aggregation from:

- `CampaignMission` + Event projection signals (lifecycle recomputed via `projectLifecyclePhase`)
- `MissionPreparation` (readiness, key message, strategic purpose)
- `MissionExecution` (status, timestamps, field-capture counts)
- `MissionDebrief` (status, outcome, approved-follow-up counts)
- `MissionFollowUp` + `MissionFollowUpAction` (workspace status, unresolved actions)

Legacy Mission Card status is never used.

## Schema decision

**No new database model.** Command Center is a derived read model. New persisted Command Center rows: **0**.

## Time horizon (centralized)

`DEFAULT_COMMAND_CENTER_CONFIG` in `src/lib/missions/v21/command-center/config.ts`:

| Key | Default |
|-----|---------|
| `upcomingWindowDays` | 14 |
| `recentlyClosedWindowDays` | 7 |
| `prepareRiskWindowHours` | 72 |
| `executeNotStartedGraceMinutes` | 30 |
| `arrivedNotStartedWarningMinutes` | 45 |
| `executionOverrunWarningMinutes` | 90 |
| `debriefExpectedWithinHours` | 24 |
| `debriefApprovalExpectedWithinHours` | 48 |

Missions with unresolved Debrief/Follow-up remain eligible regardless of Event age.

All day/due logic uses campaign timezone from `getPublicAppConfig().campaignTimezone` (America/Chicago).

## Sections

1. Command header  
2. Immediate attention  
3. Active now  
4. Coming next  
5. Preparation risk  
6. Execution exceptions  
7. Debrief queue  
8. Follow-up accountability / Commitment watch / Blocked work  
9. Ready to close  
10. Recently closed  
11. Operational summary  

## Immediate-attention rules

Typed reasons in `attention-rules.ts`. Severity: `CRITICAL` / `HIGH` / `NORMAL` (labels: Immediate / Needs attention / Review).

Examples:

- `EXECUTION_NOT_STARTED` — Execute phase, not started after grace → Critical  
- `URGENT_COMMITMENT_OVERDUE` — commitment action overdue + URGENT → Critical  
- `FOLLOW_UP_BLOCKED` — severity from priority/due/closeout impact  
- `PREPARATION_NOT_READY` — within prepare-risk window and not ready  
- `DEBRIEF_NOT_STARTED` — High only after configured expected hours; otherwise age language  
- `MISSION_READY_TO_CLOSE` — Follow-up `READY_TO_CLOSE` and not closed  
- `RECORD_INTEGRITY_REVIEW` — e.g. Follow-up without approved Debrief  

Ranking: severity → documented reason order → earliest relevant timestamp → mission ID (`attention-ranking.ts`).

## Architecture

| Layer | Path |
|-------|------|
| Domain | `src/lib/missions/v21/command-center/*` |
| Repository | `src/server/repositories/mission-command-center-repository.ts` |
| Service | `src/server/services/mission-command-center-service.ts` |
| UI | `src/components/missions/command-center/MissionCommandCenter.tsx` |
| Page | `src/app/system/missions/command-center/page.tsx` |

### Query strategy

One bounded `findMany` with selective includes for preparation/execution/debrief/followUp(+actions). No per-Mission N+1. Section caps applied server-side. Private notes / full JSON documents are not serialized into the view model.

## Filters

Query params: `view`, `phase`, `search`. Unknown values fall back safely via `parseCommandCenterFilters`.

Examples:

- `/system/missions/command-center?view=attention`
- `/system/missions/command-center?phase=debrief`

## Refresh / stale data

Server-rendered on request. Manual Refresh link reloads with current filters. Shows “Last refreshed …”. If older than 15 minutes in the client clock after render, shows “This operating view may be out of date.” No websockets / polling.

## Privacy

Aggregate cards omit full private notes. Metadata title/description contain no Mission PII. `robots: noindex`.

## Hard boundaries (confirmed)

Does **not** mutate Event schedule, lifecycle, operational status, preparation, execution, debrief, or follow-up. Does not close Missions, approve Debriefs, send notifications, or add AI analysis.

## Validation

```text
npm run missions:v21:command-center:validate
```

## Campaign communications (D20)

Command Center remains read-only aggregation. D20 communications do **not** send notifications from Command Center and do not mutate Mission phase state. When communications workspaces link from Mission surfaces, operators plan outreach in the owning communications workflow — aggregate here, approve and queue there.

See `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20.md`.

## Recommended Deliverable 8

**Campaign Day Briefing** — deterministic daily operating packet from Command Center + Today’s Mission (no AI conclusions, no automated delivery).
