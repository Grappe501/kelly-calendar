# KCCC Calendar — 25-Step Master Roadmap

```text
Build: KCCC-CALENDAR-RECOVERY-RETURN-TO-CORE-1.0
Canonical tracker: THIS FILE
Date: 2026-07-21
Updated: Step 8 closeout complete → Step 9 ready
Supersedes sequencing in: docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md (historical)
Runtime step constants: src/lib/system/constants.ts
```

## Governing decision

```text
Primary product: Kelly Campaign Calendar
Communications OS (D20–D26): FROZEN — preserved, production blocked
LG-1: PAUSED
AI: disabled until Step 16 (proposal_only)
```

Every build must visibly improve one of: **Today · Calendar · Event · Mission · People · Travel · Briefing · Follow-up**, or unlock security required to use them.

Landing experience goal (later, not this step): answer *What am I doing today? / Where do I need to be? / What do I need to prepare?* — admin/system behind secondary navigation.

---

## Phase 1 — Foundation (usable calendar)

| Step | Name | Status |
|------|------|--------|
| 1–7 | Environment, scaffold, auth foundation, schema, shell, entry APIs | ✅ / 🔄 foundation |
| **8** | **Security + Candidate Data Certification** | **✅ COMPLETE** |
| **9** | **Canonical Calendar Data Model** | **⬜ NEXT** |
| 10 | Calendar Operating Views | ⬜ |
| 11 | Event Creation & Editing | ⬜ |
| 12 | Availability & Standing Rules | ⬜ |
| 13 | Conflict Engine | ⬜ |

**Phase 1 outcome:** a genuinely usable, secure campaign calendar.

---

## Phase 2 — Campaign Operations

| Step | Name | Status |
|------|------|--------|
| 14 | Mission Lifecycle | ⬜ |
| 15 | Relationship Integration | ⬜ |
| 16 | AI Assistance | ⬜ |
| 17 | Travel Planning | ⬜ |
| 18 | Briefing System | ⬜ |
| 19 | Debrief / Follow-up | ⬜ |
| 20 | Tasks & Delegation | ⬜ |
| 21 | Volunteer Scheduling | ⬜ |

**Phase 2 outcome:** Campaign Operating System on top of the calendar.

---

## Phase 3 — Ecosystem

| Step | Name | Status |
|------|------|--------|
| 22 | Calendar Import / Export | ⬜ |
| 23 | Google Sync | ⬜ |
| 24 | Hardening / Mobile | ⬜ |
| 25 | Launch Certification | ⬜ |

**Phase 3 outcome:** external integrations and launch — only after the internal experience is solid.

---

## Step 8 closeout (accepted criteria)

```text
✓ Authentication complete
✓ Authorization verified (middleware + RBAC + fail-closed APIs)
✓ Candidate-data ready = true (authorized roles)
✓ Real calendar entry enabled
✓ Warning banner suppressed when certified
✓ Status dashboard reflects certified state
✓ No new product features in the closeout pass
```

Evidence: `develop_notes/KCCC_EA_8_SECURITY_CLOSEOUT_EVIDENCE.md`

## Canonical Event rule (Step 9+)

```text
Event  (one table of record)
 ├── Participants
 ├── Mission
 ├── Travel
 ├── Briefing
 ├── Follow-up
 ├── Tasks
 ├── AI Summary
 ├── Visibility
 └── Audit
```

Do not invent parallel CampaignEvent / CalendarEvent / MissionEvent tables.

## Communications

Frozen D20–D26 may later attach as an event panel only. No LG-1 / Resend / D27 while Phase 1–2 calendar work is open unless explicitly unfrozen.

## Related docs

- `KCCC_CALENDAR_CURRENT_IMPLEMENTATION_INVENTORY.md`
- `KCCC_EA_8_SECURITY_CLOSEOUT_PLAN.md`
- `KCCC_EA_8_SECURITY_CLOSEOUT_EVIDENCE.md`
- `KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL_BUILD.md`
