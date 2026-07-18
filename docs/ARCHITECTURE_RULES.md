# Architecture Rules

**Kelly Campaign Command Calendar (KCCC)**  
Version: **1.1.0**

---

## 1. Lane isolation

```text
H:\SOSWebsite\
├── kelly-calendar\     ← KCCC (this repo)
├── RedDirt\            ← Campaign OS (separate repo / git root)
├── sos-public\         ← Public site (do not touch)
└── ...
```

| Rule | Detail |
|------|--------|
| **A1** | KCCC is a standalone Next.js application |
| **A2** | No `import` from `RedDirt/src/**` |
| **A3** | No writes to RedDirt Prisma models |
| **A4** | Shared secrets via env fallback only |
| **A5** | Future integration via HTTP APIs and stable IDs |

---

## 2. Application layers

```text
┌─────────────────────────────────────────────┐
│  Mobile PWA UI (React Server + Client)      │
│  Today · Calendar views · Event command     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Next.js Route Handlers / Server Actions    │
│  Auth gate · CRUD · AI proxy (server-only)  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Domain services                            │
│  Schedule · Travel · Search · AI proposals  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Prisma → PostgreSQL (schema kelly_calendar)│
└─────────────────────────────────────────────┘
```

---

## 3. Folder structure (target — Step 2+)

```text
src/
├── app/
│   ├── (auth)/login/
│   ├── (app)/
│   │   ├── today/
│   │   ├── calendar/[view]/
│   │   ├── events/[id]/
│   │   ├── search/
│   │   └── add/
│   └── api/
│       ├── health/
│       ├── events/
│       └── ai/
├── components/
│   ├── shell/          # Bottom nav, headers
│   ├── calendar/       # View components
│   ├── events/         # Drill-down sections
│   └── ai/             # Proposal review UI
├── lib/
│   ├── env/            # Validated env loader
│   ├── db/             # Prisma client
│   ├── auth/           # Session + roles
│   ├── ai/             # OpenAI Responses wrapper
│   ├── travel/         # Departure calculations
│   └── search/         # Query builders
└── types/
prisma/
├── schema.prisma       # PostgreSQL schema kelly_calendar
└── migrations/
```

---

## 4. Database rules

- PostgreSQL database may be shared with RedDirt hosting; **schema is isolated**
- Prisma `schemas = ["kelly_calendar"]` or table prefix `kc_`
- Every mutable record: `createdAt`, `updatedAt`, `createdById`
- Event changes append to `event_change_log` — no silent overwrites
- AI proposals stored in `event_ai_proposals` with `status: draft | approved | rejected`

---

## 5. Calendar federation model

Authoritative detail: [`CALENDAR_FEDERATION_ARCHITECTURE.md`](CALENDAR_FEDERATION_ARCHITECTURE.md).

```text
Calendar (system | team | personal)
    ├── CalendarMembership[] + CalendarPermission
    ├── CalendarRollupRule → Command Calendar
    └── EventCalendarMembership[] → canonical Event

Event (one record)
    ├── EventOccurrence[]
    ├── EventVisibility / EventSectionPermission[]
    ├── EventRelationship[]
    ├── EventSection[] / EventTask[] / EventTravelSegment[]
    └── EventAiProposal[]
```

Relationship types (enum, extensible):

`parent_of`, `child_of`, `related_to`, `follows`, `requires_travel_from`, `assigned_to`, `hosted_by`, `in_county`, `references_person`, `references_document`, `connected_calendar`

**Hard rules:**

| Rule | Detail |
|------|--------|
| **F1** | Command Calendar is roll-up truth, not a separate disconnected store of duplicate events |
| **F2** | Events use many-to-many calendar memberships (primary + connected) |
| **F3** | Default-deny; availability-only must not leak title/location/attendees |
| **F4** | Section-level ACL required for public vs internal event fields |
| **F5** | External sync never becomes authoritative master |
| **F6** | Cross-calendar conflict analysis respects viewer permissions |

---

## 6. API design

| Pattern | Use |
|---------|-----|
| `GET /api/health` | Deploy probe |
| `GET/POST /api/events` | CRUD |
| `GET /api/events/[id]/briefing` | Server-generated briefing |
| `POST /api/ai/propose-event` | NL → draft (never auto-save) |
| `POST /api/ai/analyze-schedule` | Conflict report |
| `GET /api/search?q=` | Full-text + filters |

All mutating routes require auth + role check. AI routes log metadata without prompt secrets.

---

## 7. AI architecture

```text
Client → POST /api/ai/propose-event { text, context }
              │
              ▼
         OpenAI Responses API (server)
              │
              ▼
         Zod-validated EventDraft JSON
              │
              ▼
         event_ai_proposals (status: draft)
              │
              ▼
         User reviews → POST /api/events (approve)
```

Structured outputs required — no free-form-only event creation.

Models (configurable via env):

- `OPENAI_MODEL` — default `gpt-4o-mini` for drafts
- Stronger model optional for briefings

---

## 8. Mobile-first UI rules

- Design at **375px width first**, scale up
- Bottom navigation fixed; thumb-reachable primary actions
- Touch targets ≥ 44px
- `+ Add` and microphone always reachable
- Reduce chrome on Today view — information density without clutter
- Support `prefers-reduced-motion` and high contrast

---

## 9. PWA (Steps 22+)

- `manifest.json` — `display: standalone`, campaign icons
- Service worker — cache Today + next 7 days offline
- Background sync for draft events created offline
- Install prompt on second visit

---

## 10. Maps and travel

- Store lat/lng when geocoded; always keep raw address string
- Generate deep links: `maps.apple.com`, `google.com/maps`, Waze
- Departure formula: `eventStart - travelMinutes - parkingBuffer - prepBuffer`
- Default buffers configurable per event type

---

## 11. Search

**Phase 1:** PostgreSQL `tsvector` on title, description, location, county name  
**Phase 2:** Embedding column + semantic rank for NL queries

---

## 12. Security

- CSRF protection on server actions
- Rate limit AI endpoints
- Audit log on all event mutations
- File uploads — virus scan hook placeholder; size limits; private bucket
- RBAC enforced server-side — never client-only

---

## 13. Testing strategy

| Layer | Tool |
|-------|------|
| Unit | Vitest — travel calc, env validation, AI schema |
| Integration | API route tests with test DB |
| E2E | Playwright — mobile viewport, Today flow, create event |
| AI contracts | Snapshot tests on Zod schemas for model output |

---

## 14. Deployment

- **GitHub:** `Grappe501/kelly-calendar`
- **Netlify:** separate site from RedDirt production
- Build command wraps H: locally; Netlify uses standard `npm run build`
- Environment variables set in Netlify UI — mirror RedDirt production secrets where shared

---

## 15. What's new in this codebase (2026 patterns)

| Pattern | Why |
|---------|-----|
| **OpenAI Responses API** with structured outputs | Reliable event drafts vs chat prose |
| **Next.js App Router** + Server Components | Fast mobile first paint |
| **PWA + future Capacitor** | One codebase → home screen → native shell |
| **Event graph vs flat calendar** | Drill-down and campaign intelligence |
| **Proposal-first AI** | Trust + auditability for a candidate tool |
| **Schema-namespaced Postgres** | Standalone app on shared infra |
| **H: drive env wrapper** | Disk-full C: mitigation as permanent protocol |

---

## 16. Phone capabilities roadmap

| Capability | PWA (v1) | Native shell (v2) |
|------------|----------|-------------------|
| Home screen install | ✅ | ✅ |
| Voice input | Web Speech API | Native speech |
| Camera scan | `<input capture>` | Native camera |
| Push notifications | Web Push | APNs / FCM |
| Calendar sync | ICS import/export | EventKit / Android Calendar |
| Widgets | — | iOS / Android widgets |
| Share sheet | Web Share Target API | Native share extension |
| Background location | — | Optional ETA updates |

---

## Version history

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-07-17 | Initial architecture for Step 1 |
| 1.1.0 | 2026-07-18 | Calendar federation model (Command + subcalendars) |
