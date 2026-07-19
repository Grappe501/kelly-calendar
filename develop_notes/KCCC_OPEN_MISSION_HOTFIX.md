# KCCC Open Mission Hotfix

**Date:** 2026-07-19  
**Related:** HL-039 / EA-9 OW-001  
**Scope:** Make “Open mission” truthful — no Mission Foundation build-out.

## Root cause

Mission surfaces (Mission Cards, domain ops, executive command) emit:

```text
/calendar?event=<eventId>
```

(or with `view` / `date` after this pass)

`src/app/calendar/page.tsx` previously read only `view` and `date`, so the `event` query was ignored. Clicking “Open mission” navigated to Calendar with no focus, banner, or detail — appearing as “nothing happened.”

No separate `/missions/[id]` route exists in Architecture 1.0. Canonical V1 contract is Pattern C: Calendar consumes `?event=`.

## Repair

| Area | Change |
|------|--------|
| Source | `mission-card.ts` → `buildMissionCalendarHref` (`view` + `date` + `event`); disabled when `!canOpen` / cancelled |
| UI | `MissionCardView` — real `Link` when available; disabled `button` + explanation when not |
| Destination | Calendar page resolves `event` via `resolveMissionDeepLink` |
| Banner | `MissionDeepLinkBanner` — focused / unavailable / forbidden / not-found |
| Highlight | Day / Week / Month mark focused event when authorized |

## Authorization

Destination re-runs `canAccessEvent` + `projectSafeEvent`. List-page visibility is never sufficient.

- Unauthorized → forbidden message (no title leak)
- `BUSY_ONLY` / limited (`canOpen: false`) → unavailable message; no mission title focus
- Cancelled / superseded → honest unavailable state
- `returnTo` sanitized to internal `/calendar…` only (open-redirect blocked)

## Fallback

Controls never stay clickable with no result:

- Disabled button + explanation when mission cannot open
- Banner when deep link cannot resolve

Missions are not auto-created.

## Tests

- `tests/unit/calendar/mission-deep-link.test.ts`
- `tests/unit/missions/mission-card.test.ts` (href + disabled cases)
- `tests/e2e/mission-deep-link.spec.ts` (auth gate / no console error on entry)

## HL-039 status

**PARTIALLY REMEDIATED**

- Open Mission → Calendar `?event=` consumption works for Day/Week/Month focus + honest failures.
- Broader workflow continuity (HL-040 week rail drill-down, HL-041 month hops, HL-042 domain period hops) remains open.

## Manual verify

```text
/calendar?view=day&date=2026-07-20
/calendar?view=week&date=2026-07-19
/calendar?view=month&date=2026-07-01
```

Confirm linked mission highlights; no-access / cancelled show explanations; browser console clean.
