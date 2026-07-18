# Kelly Campaign Command Calendar (KCCC)

**Kelly’s daily campaign operating system** — mobile-first, AI-assisted later, security-first now.

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Current step | **3 of 25** — Environment & Security Foundation |
| Next step | Step 4 — Auth + calendar membership RBAC |
| Timezone | `America/Chicago` |
| Election date | `2026-11-03` (configurable) |

> Real candidate schedule information remains prohibited until authentication, role-based access control, and the protected calendar database layer are implemented and certified.

---

## Federated Command Calendar

One app. Many calendar workspaces. The **Command Calendar** is the authoritative roll-up; teams manage their own areas under shared permissions, audit, and conflict standards.

See [`docs/CALENDAR_FEDERATION_ARCHITECTURE.md`](docs/CALENDAR_FEDERATION_ARCHITECTURE.md) and Constitution Article III-A.

Examples of workspaces: Candidate · Travel · Public Events · Communications · Social · Press · Field · County · Fundraising · Compliance · Volunteer · Debate · Surrogate · Staff Work · Personal/Protected.

## Standing availability (from day one)

- **Mon–Fri 8:00 AM–12:00 PM and 1:00 PM–5:00 PM** — unavailable (Kelly’s day job)
- **Vacation / explicit release** — Command Calendar may override those blocks
- **Every Tuesday** — default location Little Rock unless overridden

Policy code: `src/lib/campaign/availability-policy.ts` (not DB events yet).

---

## Environment

**Precedence:** `process.env` → `.env.local` → `.env` → approved RedDirt fallback (local only).

**Production (Netlify):** injected env vars only; `ENV_FALLBACK_TO_REDDIRT=false`.

See `.env.example` and `develop_notes/KCCC_ENVIRONMENT_ARCHITECTURE.md`.

---

## Commands

```powershell
cd H:\SOSWebsite\kelly-calendar
npm run dev
npm run build
npm run check
npm run step3:all
npm run db:diagnose
npm run env:readiness
npm run security:headers
```

---

## Status

- Auth / calendar memberships: not implemented (Step 4)
- Federated schema: not implemented (Step 5)
- AI: disabled (proposal-only later)
- Calendar tables: none
- Database mutations: not authorized
- Netlify: operator must connect site

Handoff: `develop_notes/KCCC_NEW_THREAD_HANDOFF.md`  
Federation: `docs/CALENDAR_FEDERATION_ARCHITECTURE.md`
