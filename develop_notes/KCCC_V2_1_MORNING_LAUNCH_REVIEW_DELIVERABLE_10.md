# KCCC V2.1 — Deliverable 10: Morning Launch Review

**Status:** LANDED  
**Date:** 2026-07-20  
**Routes:** `/system/briefing/launch` · `/system/briefing/[YYYY-MM-DD]/launch` · `.../report`  
**Baseline:** Campaign Day Closeout (Deliverable 9) · production commit at implement start

## Product purpose

Morning ignition: confirm overnight changes were absorbed, yesterday’s Closeout handoff still holds, the first Mission is genuinely ready, urgent carry-forward has ownership, and leadership can authorize the campaign day to begin — without starting Mission execution.

Morning Launch Review answers: **Are we ready to begin operating today?**  
Campaign Day Briefing answers: **What does today contain?**

## Routes

| Route | Role |
|-------|------|
| `/system/briefing/launch` | Redirect to campaign-local today |
| `/system/briefing/[date]/launch` | Date-specific Morning Launch Review |
| `/system/briefing/[date]/launch/report` | Print-friendly launch report |

Navigation labels: Launch Today · Morning Launch Review · Start Campaign Day  
Linked from Day Briefing, Day Closeout (including tomorrow preview), Today’s Mission, Command Center, calendar day view.

## Date semantics

- Timezone: `getPublicAppConfig().campaignTimezone` (America/Chicago)
- Key: `campaignDateKey` as `YYYY-MM-DD` (not `@db.Date`)
- Allowed: today through previous **7** days
- Future dates rejected (belong to Briefing / Prepare)
- Past days labeled historical — never “today”

## Data model

Additive models in `kelly_calendar`:

- `CampaignDayLaunchReview` — unique `campaignDateKey`
- `CampaignDayLaunchAcknowledgement` — day-level review metadata; idempotent `importKey`

Enums: `CampaignDayLaunchStatus`, `CampaignDayLaunchReadiness`, acknowledgement type/source/status.

### Launch status

`NOT_STARTED` → `IN_PROGRESS` → `REVIEWED` → `LAUNCHED`

### Readiness

`NOT_ASSESSED` · `READY` · `READY_WITH_ACCEPTED_RISK` · `NOT_READY` · `NO_MISSIONS_SCHEDULED`

### Lazy persistence

Records created only on Begin Morning Review / first save / first acknowledgement.  
Migration fabricates **zero** launch reviews, acknowledgements, launches, or accepted risks.

## Prior Closeout relationship

Loads prior day’s Closeout + carry-forward. Missing Closeout surfaces honestly:

> The prior campaign day was not formally closed out.  
> No signed-off prior-day baseline is available.

Compares last night’s tomorrow-readiness to current derived morning readiness.

## Overnight changes

Conservative, evidence-based detection only:

- Missing prior Closeout baseline
- Readiness drift vs prior Closeout
- First Mission preparation needs attention / absent
- Required departure missing
- First Mission cancelled
- Schedule overlaps

No fabricated Event diffs. No narrative AI comparison.

Severity labels reuse Immediate / Needs attention / Review (`CRITICAL` / `HIGH` / `NORMAL`).

## Acknowledgements

Day-level only. Options: Acknowledged · Resolved · Accepted Risk · Not Applicable.  
Idempotent on `acknowledgementType + sourceType + sourceRecordId` (`importKey`).  
Does **not** mutate Event, Mission, Prepare, Execute, Debrief, or Follow-up.

## Accepted risk

Requires reason + leadership permission. Clears launch readiness to `READY_WITH_ACCEPTED_RISK` only when every remaining blocker is individually accepted / resolved / N/A.  
`ACKNOWLEDGED` alone does **not** clear blockers.

## First vs primary Mission

- **First Mission:** earliest campaign-local start (stable Mission ID tie-break)
- **Primary Mission:** existing Today’s Mission selector

Travel / preparation review use stored values only — no maps, no estimated duration.

## Blocking rules (deterministic)

Examples: missing prior Closeout (when required), first Mission prep not usable, departure blocking, schedule overlap, urgent unowned carry-forward.

Nonblocking issues surface as needs attention / overnight items without auto-blocking.

## Review vs Launch

- **Complete Morning Review** → `REVIEWED` (requires summary, readiness selection, critical acknowledgements)
- **Launch Campaign Day** → `LAUNCHED` (separate; requires review complete + Ready / Ready with accepted risk / No Missions scheduled)

Launch means the operating picture was reviewed and the day is authorized to begin. It does **not** start execution, mark departure, complete work, or change Mission lifecycle.

## No-Mission day

Readiness `NO_MISSIONS_SCHEDULED`. Operators may still complete review and begin a campaign workday for due work / follow-up / preparation.

## Authorization

Page + APIs: `requireSystemAdminPage` / `roleHasFullCalendarAccess` (KELLY / CAMPAIGN_MANAGER).  
Accepted risk and launch are leadership-gated on the server.

## Concurrency

Optimistic concurrency via `expectedUpdatedAt` / `updatedAt`. Conflicts return typed errors; unsaved text retained on the client.

## Privacy

Internal notes are operator-only on the Launch Review surface; not pushed into Briefing cards, Command Center aggregates, or public metadata. Page metadata robots noindex.

## Mobile / a11y

Mobile-first section order prioritizes blockers, departure, first Mission, overnight, carry-forward, due work, checklist, then launch. Semantic headings, text severity, keyboard acknowledgements, confirm before launch.

## Performance

Reuses `loadMissionsForDayBriefing` + prior Closeout by date key. Bounded section limits. No N+1 per Mission. Readiness computed server-side.

## Hard boundaries

No AI conclusions, notifications, external services, Mission/Event mutation, auto-acknowledge, auto-launch, or fabricated owners/times/changes.

## Validation

```text
npm run missions:v21:day-launch:validate
```

Schema apply (when migrate history diverged):

```text
KCCC_ALLOW_SCHEMA_MIGRATION=1 node scripts/apply-day-launch-migration.mjs
```

## Known limitations

- Overnight Event field-level audit diffs are not available without Event version history; detection is conservative.
- Post-launch amendment workflow is deferred — operators use Command Center + canonical workspaces.
- Morning cutoff is optional (`morningLaunchCutoffLocalTime: null`); uses first departure / first Mission time.

## Recommended Deliverable 11

**Travel and Movement Operations Layer** — Mission-linked departure plans, travel legs, buffers, drivers, vehicles, lodging transitions, parking, access instructions, and arrival confirmation — without external maps or automatic routing in v1.
