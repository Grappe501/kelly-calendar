# KCCC Calendar — 25-Step Master Roadmap

```text
Build: KCCC-CALENDAR-RECOVERY-RETURN-TO-CORE-1.0
Canonical tracker: THIS FILE
Updated: Step 11 event create/edit COMPLETE → Step 12 ready
Runtime: src/lib/system/constants.ts
```

## Governing decision

```text
Primary product: Kelly Campaign Calendar
Canonical schedule entity: Prisma Event ONLY
Communications OS (D20–D26): FROZEN
LG-1: PAUSED
AI: disabled until Step 16 (proposal_only)
```

---

## Phase 1 — Foundation (usable calendar)

| Step | Name | Status |
|------|------|--------|
| 1–7 | Environment, scaffold, auth foundation, schema, shell, entry APIs | ✅ / 🔄 foundation |
| **8** | **Security + Candidate Data Certification** | **✅ COMPLETE** |
| **9** | **Canonical Calendar Data Model** | **✅ COMPLETE** |
| **10** | **Calendar Operating Views** | **✅ COMPLETE** |
| **11** | **Event Creation & Editing** | **✅ COMPLETE** |
| **12** | **Availability & Standing Rules** | **⬜ NEXT** |
| 13 | Conflict Engine | ⬜ |

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

---

## Phase 3 — Ecosystem

| Step | Name | Status |
|------|------|--------|
| 22 | Calendar Import / Export | ⬜ |
| 23 | Google Sync | ⬜ |
| 24 | Hardening / Mobile | ⬜ |
| 25 | Launch Certification | ⬜ |

---

## Canonical Event rule (locked in Step 9)

```text
Event  (one table of record)
 ├── Participants
 ├── Mission          ← projection; NOT an Event
 ├── Travel
 ├── Briefing
 ├── Follow-up
 ├── Tasks
 ├── AI Summary
 ├── Visibility
 └── Audit
```

Architecture: `develop_notes/KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL.md`  
Operating views: `develop_notes/KCCC_EA_10_CALENDAR_OPERATING_VIEWS.md`  
Create/edit: `develop_notes/KCCC_EA_11_EVENT_CREATION_EDITING.md`  
Code lock: `src/lib/calendar/canonical-event.ts`  
Validate: `npm run calendar:canonical:validate`

## Next authorized build

```text
KCCC-EA-12-AVAILABILITY-STANDING-RULES-1.0
```

Do not start automatically.
