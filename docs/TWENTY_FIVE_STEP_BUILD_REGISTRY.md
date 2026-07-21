# Twenty-Five Step Build Registry

> **Sequencing superseded (2026-07-21).**  
> Live calendar-centered tracker: [`../develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md`](../develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md)  
> Recovery inventory: [`../develop_notes/KCCC_CALENDAR_CURRENT_IMPLEMENTATION_INVENTORY.md`](../develop_notes/KCCC_CALENDAR_CURRENT_IMPLEMENTATION_INVENTORY.md)  
> This registry remains historical evidence of the original federation plan. Do not use Steps 4–25 status rows below as the live build queue.

**Kelly Campaign Command Calendar (KCCC)**  
Registry version: **1.1.0** (historical)

Each step is one commit-ready pass. Status updates in README after each push.

Legend: ⬜ pending · 🔄 in progress · ✅ complete

**Federation note:** Steps 4–25 implement the Command Calendar + subcalendar federation per [`CALENDAR_FEDERATION_ARCHITECTURE.md`](CALENDAR_FEDERATION_ARCHITECTURE.md) and Constitution Article III-A.

---

## Phase I — Foundation

| Step | Name | Deliverable | Status |
|------|------|-------------|--------|
| **1** | Master Product Constitution | Vision, AI doctrine, H: protocol, federation rule | ✅ |
| **2** | Standalone Application Scaffold | Next.js + TS + lint + test + Git + Netlify config | ✅ |
| **3** | Environment and Security Layer | Env loader, RedDirt fallback, security, feature-flag groundwork | ✅ |
| **4** | Authentication and Calendar RBAC | Login + system roles + calendar/event/section memberships + availability-only | ⬜ |
| **5** | Federated Calendar Data Foundation | Calendars, groups, M2M memberships, roll-up, visibility, audit | ⬜ |

---

## Phase II — Working Calendar

| Step | Name | Deliverable | Status |
|------|------|-------------|--------|
| **6** | Mobile Application Shell | Bottom nav, headers, responsive layout, a11y base | ⬜ |
| **7** | Event Creation and Editing | CRUD with primary/connected calendars, visibility, roll-up | ⬜ |
| **8** | Today Command Center | Merged authorized layers — next event, leave-by, prep | ⬜ |
| **9** | Day and Hourly Timeline | Travel, prep, buffer blocks across layers | ⬜ |
| **10** | Multi-View + Layers | Week/Month/Campaign-Year + layer filters + saved views | ⬜ |

**Checkpoint:** Usable federated calendar without AI.

---

## Phase III — Rich Event Intelligence

| Step | Name | Deliverable | Status |
|------|------|-------------|--------|
| **11** | Event Command Page | Full drill-down + section ACL | ⬜ |
| **12** | People, Organizations, Locations | Reusable records + event links | ⬜ |
| **13** | Tasks and Assignments | Source / assignee / event / command-when-needed | ⬜ |
| **14** | Files, Photos, Notes | Attachments with visibility | ⬜ |
| **15** | Travel and Departure Intelligence | Maps, departure calc, segments | ⬜ |

---

## Phase IV — AI Calendar Director

| Step | Name | Deliverable | Status |
|------|------|-------------|--------|
| **16** | AI Event Creation | NL → structured proposal → approve | ⬜ |
| **17** | Voice Event Creation | Speech capture + review | ⬜ |
| **18** | AI Conflict Analyst | Cross-calendar conflicts (permission-aware) | ⬜ |
| **19** | Daily and Event Briefings | Evidence-grounded briefings | ⬜ |
| **20** | AI Search and Conversation | NL across authorized calendars | ⬜ |

**Checkpoint:** AI-assisted scheduling with human approval.

---

## Phase V — Candidate-Grade Operations

| Step | Name | Deliverable | Status |
|------|------|-------------|--------|
| **21** | Notifications and Reminders | Push, departure, follow-ups, approval alerts | ⬜ |
| **22** | PWA Install and Offline | Manifest, SW, IndexedDB sync | ⬜ |
| **23** | External Calendar Sync | ICS + controlled provider sync (never master) | ⬜ |
| **24** | Campaign Intelligence Dashboard | Coverage, conflicts, bottlenecks, county gaps | ⬜ |
| **25** | Launch Certification | Audits, module API, v2 roadmap | ⬜ |

---

## Step detail — completed

| Step | Report |
|------|--------|
| 1 | Constitution (+ v1.1.0 federation amendment) |
| 2 | `develop_notes/KCCC_STEP_02_IMPLEMENTATION_REPORT.md` |
| 3 | `develop_notes/KCCC_STEP_03_IMPLEMENTATION_REPORT.md` |

## Step detail — Step 4 (next)

Authentication **and** calendar membership RBAC:

- System roles
- Calendar / event / section permissions
- Availability-only access
- Team membership + delegated calendar management
- Default-deny enforcement on all schedule APIs

## Step detail — Step 5

Federated schema: `kccc_calendars`, groups, memberships, permissions, roll-up rules, M2M event memberships, visibility, saved views, external connections, audit log. Seed system calendars + standing availability policy (work blocks, Tuesday Little Rock) as calendar data — no real PII.

---

## Compression guidance

Steps 6–10 can ship incrementally — Kelly gets value after Step 8 (merged Today).

Do not implement every team calendar UI in Step 5; seed system calendars and permission model first, expand team workspaces as modules.

Steps 16–20 require stable Step 7 CRUD + Step 4 permissions.

---

## Version history

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-07-17 | Initial registry |
| 1.0.1 | 2026-07-18 | Constitution polish |
| 1.1.0 | 2026-07-18 | Federation amendment — broaden Steps 4–5, 7–8, 10, 13, 18, 20, 24 |
