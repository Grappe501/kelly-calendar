# Master Product Constitution

**Kelly Campaign Command Calendar (KCCC)**  
Version: **1.0.1**  
Step: **1 of 25**  
Status: **Ratified — build authority document**

---

## Preamble

This constitution governs the Kelly Grappe for Arkansas standalone calendar program. It exists so every builder — human or AI — ships the same product: **Kelly’s daily operating system**, not a decorative calendar.

---

## Article I — Product identity

| Item | Definition |
|------|------------|
| **Public name** | Kelly Campaign Command Calendar |
| **Internal shorthand** | KCCC |
| **Candidate** | Kelly Grappe |
| **Office** | Arkansas Secretary of State |
| **Election Day** | Tuesday, November 3, 2026 |
| **Campaign window** | Present day through Election Day (inclusive views) |
| **Repository** | `H:\SOSWebsite\kelly-calendar\` |
| **Remote** | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |

---

## Article II — Central question

Every screen, API, and AI feature must help Kelly answer:

```text
Where do I need to be?
When do I need to leave?
What do I need to know?
Who will be there?
What must happen next?
```

If a feature does not serve one of these, it is deferred to a post-v1 module.

---

## Article III — Design principle: Campaign Time Graph

Every scheduled block is a **campaign intelligence container**, not merely title + time + location.

```text
Saline County Community Meeting
    ├── Schedule and travel
    ├── Venue
    ├── Hosts and attendees
    ├── County intelligence
    ├── Relationship history
    ├── Talking points and likely questions
    ├── Materials checklist
    ├── Staff assignments
    ├── Communications plan
    ├── Expenses and mileage
    ├── Follow-up commitments
    └── Post-event report
```

**Implementation:** flexible **event-node graph** — events link to subevents, people, places, tasks, files, notes, counties, conversations, expenses, and follow-ups. Drill-down is deep and structured; it is not infinite nesting of arbitrary pages.

---

## Article IV — First-run experience (mobile-first)

Kelly opens the app and sees **Kelly’s Day**, not a grid of tiny boxes:

```text
Friday, July 17

NEXT
11:30 AM — Lunch with Saline County Leaders
Leave by 10:42 AM · 48-minute drive · Bryant, Arkansas

Before You Go
• Review names and relationship notes
• Confirm campaign materials are packed
• Prepare answer on ballot access

After This
2:30 PM — Sponsor call
5:30 PM — Conway County event
```

Primary navigation (bottom bar):

```text
Today | Calendar | + Add | Search | More
```

Center **+ Add** opens: Speak · Type · Scan · Quick · Copy · Import

From Today / Calendar / More, Kelly can also reach:

```text
Today · Tomorrow · Week · Month · Campaign Year
Election Countdown · Map · Search · AI Assistant
```

Floating AI control answers: “What is next?”, “When do we leave?”, “Who will be there?”, “What do I still need to prepare?”, “Where are the schedule risks this week?”

---

## Article V — Calendar views (v1 scope)

| View | Purpose |
|------|---------|
| **Today** | Operational command — next event, departure, prep status, risks |
| **Tomorrow** | Next-day command preview (same intelligence model as Today) |
| **Day** | Hourly timeline with travel, prep, events, protected time |
| **Week** | Workload, travel, county coverage, gaps |
| **Month** | Conventional month + density + filters |
| **Campaign Year** | Now → Election Day — milestones, county visits, deadlines, gaps |
| **Election Countdown** | Days remaining, critical deadlines, prep warnings |
| **Hourly** | Operational micro-timeline (depart, arrive, meet host, etc.) |
| **Map** | Geographic event layers (today / week / county / unvisited) |
| **AI Assistant** | Conversational schedule help; proposals only until approved |

---

## Article VI — Event command page (drill-down sections)

Each event exposes expandable sections:

1. Overview (status, time, location, type, owner, source)
2. Schedule (arrival, departure, travel, buffers, dependencies)
3. People (hosts, staff, media — each person drill-down)
4. Preparation (objectives, talking points, materials, wardrobe)
5. Location (address, maps links, parking, venue contact)
6. County intelligence (profile, issues, prior visits, promises)
7. Communications (pre/post social, press, photography)
8. Tasks (before / during / after)
9. Files (invitations, agendas, photos, receipts)
10. Follow-up (promises, thank-yous, next meetings)
11. History (audit log, AI proposals, approvals)

---

## Article VII — Search and interaction

Global search supports keywords **and** natural language:

- `Heber Springs`
- `Events Chris is attending`
- `County dinners in August`
- `Events without confirmed addresses`
- `Open Saturdays before Election Day`
- `Counties we have not visited`

Filters: date range, county, city, type, status, person, staff owner, travel required, prep status, follow-up status, tags.

Saved searches become dashboard cards in later steps.

---

## Article VIII — AI doctrine (non-negotiable)

### The AI Campaign Day Director

Kelly speaks or types natural language; AI returns a **proposed structured event** for review.

### Three-class information model

Every AI output labels each field:

| Class | Meaning |
|-------|---------|
| **Confirmed** | From database or explicit user input |
| **Interpreted** | AI inference — must be visible |
| **Missing** | Required for safe execution — flagged |
| **Recommended** | Suggested action — not auto-applied |

### Hard prohibitions

- AI **never** silently publishes or modifies events
- AI **never** invents venue addresses, attendee confirmations, or compliance facts
- AI **never** receives or exposes `OPENAI_API_KEY` on the client
- All AI mutations create `event_ai_proposals` awaiting human approval
- System role **System AI** may analyze and propose only

### Initial AI features (Steps 16–20)

1. AI Event Builder (typed NL → structured draft)
2. Voice Event Builder (speech → draft)
3. Conflict and completeness analyst
4. Daily and event briefings (evidence-grounded)
5. NL search and calendar conversation
6. Schedule Optimizer (suggests grouping, rest blocks, coverage gaps — never auto-applies)
7. Follow-Up Generator (dictated post-event notes → proposed tasks, people notes, invitations)

---

## Article IX — Phone-native capabilities

### Phase 1 (PWA — Steps 2–23)

- Install to home screen (standalone display)
- Offline cache of current schedule
- Web Speech API for voice capture (with review)
- Camera / file upload for scan-to-propose
- Deep links: Apple Maps, Google Maps, Waze
- Push notifications (Step 21)
- Share-target intake (later in v1)

### Phase 2 (Capacitor shell — post Step 25)

- Native calendar read/write (EventKit / Android Calendar)
- Reliable local alarms and widgets
- Siri / Google Assistant shortcuts
- Share sheet → Kelly Calendar
- Live Activities / lock-screen surfaces

---

## Article X — Technology stack

```text
Application     Next.js App Router, TypeScript, React, mobile-first CSS
Database          PostgreSQL via Prisma (schema: kelly_calendar)
Auth              Supabase Auth or RedDirt-compatible secure session pattern
AI                OpenAI Responses API — structured outputs, tool calling, server-only
Deploy            GitHub → Netlify (separate site from kgrappe.netlify.app)
Offline           PWA manifest, service worker, IndexedDB
Search            PostgreSQL full-text → vector semantic (later)
Maps              Provider abstraction (Apple / Google / Waze links)
Testing           Vitest, Playwright, typecheck, AI contract tests
Observability     Structured audit logs, AI request metadata (no secrets)
```

Pin exact package versions in Step 2 — no uncontrolled major upgrades mid-campaign.

---

## Article XI — Data architecture (modular from day one)

Core entities (namespace `kelly_calendar`):

```text
users, roles
calendar_events, event_occurrences
event_relationships, event_sections, event_notes
event_people, event_locations, event_tasks, event_files
event_tags, event_reminders, event_assignments
event_status_history, event_change_log, event_ai_proposals
event_followups, event_travel_segments, event_expenses
people, organizations, locations, counties
campaign_milestones, saved_searches
notification_preferences, external_calendar_connections
```

**Event relationships** connect events to people, counties, tasks, documents, trips, milestones — enabling graph queries without schema churn.

Kelly Calendar **does not** write into RedDirt application tables.

---

## Article XII — User roles

| Role | Authority |
|------|-----------|
| **Kelly** | Full visibility; final approval on all changes |
| **Campaign Manager** | Create, modify, assign, confirm |
| **Scheduler** | Events, travel, confirmations |
| **Staff** | Assigned events and prep items |
| **Volunteer** | Explicitly shared events/tasks only |
| **Read-Only Advisor** | Selected visibility, no edits |
| **System AI** | Propose only — cannot approve |

---

## Article XIII — Environment and secrets

Load order:

1. `kelly-calendar/.env.local`
2. Approved shared values from `../RedDirt/.env.local`
3. Netlify environment in production

Never:

- Copy secrets into source
- Expose `OPENAI_API_KEY` via `NEXT_PUBLIC_*`
- Commit `.env` or `.env.local`

See [`ENVIRONMENT_PROTOCOL.md`](ENVIRONMENT_PROTOCOL.md).

---

## Article XIV — Integration boundaries

KCCC is **standalone now**, **connectable later**:

| Module (future) | Interface |
|-----------------|-----------|
| RedDirt admin / intake | REST + stable event IDs |
| County workbench | County ID + visit records |
| Contacts / CRM | Person ID references |
| Communications | Event-linked content IDs |
| Fundraising | Milestone + event linkage |

No cross-lane imports without Steve-approved integration packet.

---

## Article XV — Scope boundaries (Version 1)

**In scope:** scheduling, drill-down events, travel intelligence, AI-assisted creation with approval, search, PWA, role-based auth.

**Out of scope for v1:**

- Full CRM, email client, volunteer platform, accounting
- Public event website
- RedDirt replacement
- Autonomous AI scheduling (no auto-apply)
- Native App Store / Play Store apps on day one

### Data safety

- **No hard deletes** of calendar events in v1 — cancel / archive / soft-cancel only
- No real voter or donor PII in seeds, smoke tests, or screenshots
- No unsourced opponent claims in AI briefings or talking-point drafts
- No secret values in docs, chat, logs, commits, or screenshots

---

## Article XVI — Milestone deliverables

### After Step 10 — Working calendar

Secure login, mobile shell, CRUD, Today/Day/Hour/Week/Month/Campaign-Year views, search-ready data, Netlify deploy.

### After Step 20 — AI scheduling system

Voice + typed AI creation, conflict detection, briefings, NL search, travel warnings, human approval loop.

### After Step 25 — Candidate-grade platform

Notifications, offline PWA, ICS import/export, campaign dashboard, launch certification, module API for v2.

---

## Article XVII — Quality and safety gates

Every step must pass gates in [`ACCEPTANCE_GATES.md`](ACCEPTANCE_GATES.md) before the next step begins.

Hard stops: secrets in diff, H: preflight failure, cross-lane contamination, AI auto-publish, same test failure twice.

---

## Article XVIII — Build workflow

- One git repository: `kelly-calendar`
- Commit and push after **every completed interaction/pass**
- Netlify auto-deploy from `main` (Steve configures after first push)
- All local work on H: per [`H_DRIVE_FOREVER_PROTOCOL.md`](H_DRIVE_FOREVER_PROTOCOL.md)

---

## Article XIX — The breakthrough metric

Success is measured by questions only this system can answer:

- How much campaign time in Northeast Arkansas?
- Which events have incomplete follow-up promises?
- Who will Kelly see next week that she has met before?
- Where is travel load excessive?
- Which counties have no visit before Election Day?
- What must Kelly know before she walks into the room?

---

## Ratification

This document is Step 1 deliverable. It was first ratified and pushed on **2026-07-17** (`7feb928`). Version **1.0.1** closes navigation and AI-capability gaps from the full product brief without changing Step 1 status.

**Next action:** [`TWENTY_FIVE_STEP_BUILD_REGISTRY.md`](TWENTY_FIVE_STEP_BUILD_REGISTRY.md) → Step 2.
