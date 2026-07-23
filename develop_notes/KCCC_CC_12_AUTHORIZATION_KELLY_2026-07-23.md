# Kelly Authorization — CC-12 Mobile Hardening, Print Day Sheets & Accessibility

```text
ADR:           ADR-100
Date:          2026-07-23
Authority:     Explicit Kelly execution script via standing ADR-094
Scope:         CC-12 only
CC-11 release: d570dc6 · deploy 6a61aa30fc4c865f2bd3c628
Migration:     NONE (prefer no CalendarPrint* schema)
```

Kelly explicitly authorizes implementation and full ship cycle of **CC-12: Mobile Hardening, Print Day Sheets & Accessibility**, including planning, code, validation, documentation, commit, push, Netlify deployment, corrective follow-ups, redeployment, and live verification — under standing execution **ADR-094**.

## Authorized actions

- Mobile-safe calendar layouts (Day / Week / Month / Agenda), touch targets, reduced-motion respect
- Print projections for day sheets, week overview, and agenda (privacy profiles)
- Accessibility hardening: accessible names, landmarks, status as text (not color-only)
- Operator print preview routes under `/system/calendar/print/**` (session-authenticated)
- Documentation: mobile usability doctrine, print doctrine/operator guide, a11y conformance target report, technical closeout, human usability gate checklist

## Forbidden in CC-12

- Prisma migration / `CalendarPrint*` models
- Mutating Events or Missions from print or mobile surfaces
- Reopening CC-11 auto-repair, ICS privacy defaults, or bulk hard-delete
- Public anonymous print routes or ICS feeds
- Push / `gcm_sender_id` / notification stack expansion
- **Phase Two** IC-01…IC-12 implementation (vision only — ADR-093)

## Binding constraint

CC-12 is a **presentation and usability** build. Print is a read-only projection with privacy redaction. Event remains schedule SoR; Mission lifecycle is untouched.

Usability Synthesis remains **EMPTY**. After technical COMPLETE, a separate **human usability gate** is still required before Phase Two IC authorization. ADR-093 Phase Two remains vision only. CC-11 remains **COMPLETE**.
