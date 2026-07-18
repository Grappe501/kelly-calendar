# Kelly Campaign Command Calendar (KCCC)

**Kelly’s daily campaign operating system** — mobile-first, AI-assisted later, security-first now.

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Current step | **5 of 25** — Database foundation (**PARTIAL**) |
| Blocking next | **Step 4 — Auth + RBAC** (required before live mutations) |
| Owned schema | `kelly_calendar` |
| Historical import floor | **2025-11-01** |
| Timezone | `America/Chicago` |
| Election date | `2026-11-03` (configurable) |

> Real candidate schedule information remains prohibited until authentication, role-based access control, and protected mutation paths are certified. Schema exists; live writes are off.

### Permanent visibility rule

When a viewer lacks full access, the time block **stays visible** with:

1. Primary calendar name  
2. Safe event title  
3. General location (when safe)  
4. Start / end times  

Protected notes, people, logistics, and strategy are omitted server-side.

---

## Database (Step 5)

- Shared RedDirt PostgreSQL **server**; owned schema **`kelly_calendar`**
- Migration: `20260718160000_kelly_calendar_foundation`
- 60 tables; 75 Arkansas counties seeded; 17 system calendars including Command Calendar
- RedDirt structural integrity before/after: **0** difference
- Mutations: **unauthorized** until Step 4

```powershell
npm run db:classify
npm run db:preflight
npm run db:schema:verify
npm run db:seed:reference
npm run step5:validate
```

---

## Federated Command Calendar

One app. Many calendar workspaces. The **Command Calendar** is the authoritative roll-up; teams manage their own areas under shared permissions, audit, and conflict standards.

## Commands

```powershell
cd H:\SOSWebsite\kelly-calendar
npm run dev
npm run build
npm run auth:validate
npm run step5:all
```

---

## Status

- Auth / RBAC: **not implemented** (Step 4) — next required work
- Federated schema: **applied** (Step 5 partial)
- AI: disabled
- Database mutations: **not authorized**
- Netlify: operator must connect site

Handoff: `develop_notes/KCCC_NEW_THREAD_HANDOFF.md`  
Readiness: `develop_notes/KCCC_STEP_05_DATABASE_READINESS_REPORT.md`
