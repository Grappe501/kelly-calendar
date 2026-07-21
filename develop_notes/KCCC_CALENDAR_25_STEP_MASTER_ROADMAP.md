# KCCC Calendar — 25-Step Master Roadmap

```text
Build: KCCC-CALENDAR-RECOVERY-RETURN-TO-CORE-1.0
Canonical tracker: THIS FILE
Date: 2026-07-21
Supersedes sequencing in: docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md (historical)
Runtime step constants: src/lib/system/constants.ts (must stay aligned)
```

## Governing decision

```text
Primary product: Kelly Campaign Calendar
Communications OS (D20–D26): FROZEN — preserved, production blocked
LG-1: PAUSED — no credentials, no Phase C+
AI: disabled until Step 16 (proposal_only)
```

Every build must visibly improve one of: **Today · Calendar · Event · Mission · People · Travel · Briefing · Follow-up**, or unlock security required to use them.

---

## Progress tracker (operator)

| Step | Name | Status | Notes |
|------|------|--------|-------|
| 1 | Master Product Constitution | ✅ DONE | Historical |
| 2 | Application scaffold | ✅ DONE | Next.js/TS/Netlify |
| 3 | Environment and security layer | ✅ DONE | Env loader, headers |
| 4 | Authentication foundation | 🔄 PARTIAL | Login/session exist; honesty + cert pending |
| 5 | Federated calendar schema foundation | 🔄 PARTIAL | Rich Prisma models exist |
| 6 | Mobile application shell | 🔄 PARTIAL | Bottom nav present |
| 7 | Event APIs and draft entry | 🔄 PARTIAL | APIs + `/add`; real PII prohibited |
| **8** | **Security + candidate-data closeout** | **🔄 CURRENT** | **`KCCC-EA-8-SECURITY` — closeout plan** |
| 9 | Canonical calendar data model | ⬜ NEXT | Spec ready; implement after Step 8 |
| 10 | Calendar operating views | ⬜ | Today/Day/Week/Month/Agenda… |
| 11 | Event creation and editing | ⬜ | Full operator CRUD |
| 12 | Availability and standing rules | ⬜ | Work blocks, Tuesday LR, vacation |
| 13 | Conflict and feasibility engine | ⬜ | Travel-time + overlaps |
| 14 | Mission lifecycle integration | ⬜ | Event → mission ops |
| 15 | People and relationship integration | ⬜ | Participants + history |
| 16 | AI calendar assistance | ⬜ | proposal_only |
| 17 | Travel planning | ⬜ | Deepen travel UX |
| 18 | Briefing system | ⬜ | Daily/event briefings |
| 19 | Debrief and follow-up | ⬜ | Close the loop |
| 20 | Task and delegation integration | ⬜ | Assignments |
| 21 | Volunteer and staff scheduling | ⬜ | Staffing calendars |
| 22 | External calendar import/export | ⬜ | ICS + controlled export |
| 23 | Google Calendar controlled sync | ⬜ | Import-first; never master |
| 24 | Operational hardening and mobile review | ⬜ | Hardening + a11y |
| 25 | Production launch certification | ⬜ | Launch gate |

**Remaining steps to track:** **8 → 25** (18 steps). Steps 1–7 are foundation/partial — not reopened unless a defect blocks Step 8+.

---

## Step detail (calendar-centered)

### Steps 1–8 — Foundation, auth, security

Complete Step 8 per `KCCC_EA_8_SECURITY_CLOSEOUT_PLAN.md`:

```text
Authentication complete: true
Candidate-data ready: true
Real schedule data permitted for authorized roles
```

### Step 9 — Canonical calendar data model

`KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL_BUILD.md`  
Reuse `Event` / `Calendar*` — extend availability; no duplicate schemas.

### Step 10 — Calendar operating views

```text
Today · Day · Week · Month · Agenda · Unscheduled · Needs attention · Conflicts · Travel
```

Primary page: **Today’s Campaign Schedule** (not communications, not provider config).

### Step 11 — Event creation and editing

Create, edit, cancel, reschedule, duplicate, attendees, staff, privacy, prep, travel, follow-up, recurrence + instance override.

### Step 12 — Availability and standing schedule rules

Mon–Fri work blocks; Tuesday Little Rock default; vacation overrides. Influence conflict detection and create warnings (never silent override).

### Step 13 — Conflict and feasibility engine

Overlaps, work-hour conflicts, travel-time conflicts, missing location/staff, override-required states.

### Step 14 — Mission lifecycle integration

Event → objective → preparation → travel → execution → debrief → follow-up. Reuse existing mission projection.

### Step 15 — People and relationship integration

Attendees, orgs, relationship history, owners, follow-up status on the event.

### Step 16 — AI assistance

Briefings, conflict explanations, prep/follow-up suggestions, optimization **proposals only**. No autonomous create/move/cancel.

### Steps 17–21 — Operations depth

Travel, briefing, debrief/follow-up, tasks/delegation, volunteer/staff scheduling.

### Steps 22–23 — External calendars

Import/export; Google controlled sync (never master of campaign truth).

### Steps 24–25 — Hardening and launch

Mobile/ops hardening; production launch certification.

---

## Communications (dependent only)

Frozen D20–D26 may later attach as an **event panel**:

```text
Event communications
  Volunteer reminder / Press advisory / Follow-up / Thank-you
```

Never a second calendar app. No LG-1 / Resend / D27 work while Steps 8–15 are open unless Steve explicitly unfreezes.

---

## Alignment rules for agents

1. Update `CURRENT_STEP_NUMBER` / `CURRENT_STEP_ID` when a step is accepted.
2. Update this table’s Status column in the same commit.
3. Do not treat `docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md` as the live sequence without reconciling here.
4. Status page links here as **Calendar roadmap**.

## Related recovery docs

- `KCCC_CALENDAR_CURRENT_IMPLEMENTATION_INVENTORY.md`
- `KCCC_EA_8_SECURITY_CLOSEOUT_PLAN.md`
- `KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL_BUILD.md`
