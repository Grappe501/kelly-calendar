# KCCC — Volunteer staffing operator guide (D19)

## Principles

1. Requirement ≠ assignment — define roles first, assign people explicitly.
2. Mobilize RSVP ≠ commitment ≠ assignment — aggregate availability only.
3. Remote attendance (D18) ≠ staffing check-in ≠ Execute.
4. Staffing check-in ≠ Field Ops confirmation ≠ Mission Execute start.
5. `MANUAL_SCOPED` contact hints are operational notes — **not communication consent**.
6. `ACKNOWLEDGED` records awareness — it does **not** clear Launch blockers.
7. Page loads do not sync Mobilize or auto-create staffing plans.

## Who

Leadership roles (`assertLeadership`) for plan open, requirements, assignments, confirmation, and acknowledgements. Day board and report are read-oriented aggregation for authorized operators.

## Workflow — Mission staffing

1. Open `/system/missions/[missionId]/staffing` → **Open staffing plan** (lazy create — first intentional action only).
2. Set `staffingRequired` when the Mission needs staffed roles for Launch/day ops.
3. Add requirements: `roleLabel`, `requiredCount`, `minimumCount`, criticality, optional `requiredByAt`.
4. Create assignments explicitly:
   - **Campaign user** — pick existing user.
   - **Local person** — pick existing Person (none auto-created).
   - **Manual scoped** — display label required; contact hint optional.
   - **Confirmed external ref** — only after D18 match review shows `CONFIRMED` (person-level apply may still be disabled globally).
5. Advance assignment status: `PROPOSED` → `ASSIGNED` → `CONFIRMED` → day-of `CHECKED_IN` / `RELEASED` / `NO_SHOW`.
6. Review coverage findings and Mobilize availability panel (aggregates only when D18 observations exist).
7. When satisfied, run **Confirm staffing plan** — stores `confirmationFingerprint`; later schedule/requirement/assignment changes mark plan stale.
8. Disposition findings: `ACCEPTED_RISK` or `RESOLVED` clears readiness blockers; `ACKNOWLEDGED` does not.

## Workflow — Mobilize cancellation reconciliation

1. Ensure D16 external Event reference and D18 attendance observations exist (optional).
2. When linking an assignment to a D18 observation (`mobilizeObservationId`), staffing surfaces show linked cancellation warnings if Mobilize status is cancelled.
3. **Do not expect auto-cancel** — operator updates assignment status explicitly.
4. RSVP signup counts in the availability panel are **not** staffed headcount.

## Workflow — Day staffing board

1. `/system/briefing/staffing` → today's board (campaign timezone).
2. `/system/briefing/[date]/staffing` — cross-Mission staffing readiness, gaps, and stale plans.
3. `/system/briefing/[date]/staffing/report` — read-only report for leadership review.

## Workflow — Launch integration

Morning Launch Review may show staffing blockers when `staffingRequired` and uncleared BLOCKER findings exist. Launching the day does **not** auto-confirm assignments or mutate staffing rows.

## Validation before ship / after changes

```bash
npm run missions:v21:staffing:validate
npm run typecheck
```

## Migration (when schema not yet applied)

```bash
KCCC_ALLOW_SCHEMA_MIGRATION=1 node scripts/apply-volunteer-staffing-migration.mjs
```

Expect zero pre-existing staffing rows; post-migration counts should remain 0 until operators open plans.

## Privacy

- Day board and Mobilize availability panels show aggregates and display-safe assignment labels only.
- No Mobilize PII roster in staffing views.
- No consent inferred from Mobilize signup or contact hints.

## Do not

- Auto-assign from RSVP counts or attendance observations.
- Create Person records from staffing surfaces.
- Treat staffing `CHECKED_IN` as Execute or Field Ops confirmation.
- Send volunteer messages from staffing (deferred to D20 communications queue).
- Expect Closeout or Launch to close staffing plans automatically.

## Rollback

See `KCCC_V2_1_VOLUNTEER_STAFFING_DELIVERABLE_19_ROLLBACK.md`.
