# Calendar Federation Architecture

**Kelly Campaign Command Calendar (KCCC)**  
Version: **1.0.0**  
Status: **Ratified — binds Steps 4–25**

---

## Governing rule

> The Kelly Grappe Command Calendar is the authoritative roll-up of campaign time, commitments, deadlines, preparation, travel, communications, and operational activity. Specialized calendars may be independently managed by authorized teams, but all calendars must use shared event, permission, audit, and conflict-detection standards so the campaign can operate from one reliable source of truth.

One standalone application. Inside it: a **calendar federation**.

---

## Command Calendar (master)

Kelly and authorized leadership see the combined operational truth. Each item retains its **primary** and **connected** calendars so cross-team conflicts surface only at command level (e.g. livestream vs travel drive time).

---

## System calendars (initial registry)

```text
Candidate Schedule
Travel Calendar
Public Events Calendar
Internal Meetings Calendar
Communications Calendar
Social Media Calendar
Press and Media Calendar
Field Organizing Calendar
County Activity Calendars
Fundraising Calendar
Compliance Calendar
Volunteer Calendar
Debate and Preparation Calendar
Surrogate Calendar
Staff Work Schedules
Personal and Protected-Time Calendar
(+ future specialized calendars)
```

These are **workspaces**, not separate apps.

---

## Calendar kinds

| Kind | Examples |
|------|----------|
| **System** | Command, Candidate, Travel, Communications, Compliance |
| **Team** | Communications Team, Field, Finance, Pulaski County, NWA |
| **Personal** | Kelly, Campaign Manager, Communications Director, Scheduler |

Personal calendars may roll **availability** upward without exposing private detail.

---

## Calendar groups (UI / ops)

1. **Candidate Operations** — candidate schedule, protected time, travel, prep, calls, internal meetings  
2. **Public Engagement** — public events, county visits, community, volunteer, surrogates  
3. **Communications** — planning, press, social, email, website, content, approvals  
4. **Campaign Operations** — staff schedules, field, finance, fundraising, compliance, data, logistics  

---

## Permissions (multi-level)

### Calendar-level

`NO_ACCESS` · `AVAILABILITY_ONLY` · `VIEW` · `CONTRIBUTE` · `EDIT` · `MANAGE` · `ADMINISTER`

**Availability only** shows busy blocks without why / where / whom.

### Event-level

Event visibility may tighten or widen relative to calendar defaults (public rally vs donor strategy vs medical/protected).

### Section-level

Public fields vs internal fields (security notes, host phone, talking points, private attendee notes) are independently permissioned.

Default: **deny** until membership grants access.

---

## Many-to-many events ↔ calendars

Events are **not** forced into a single `calendar_type`.

```text
calendar_events (canonical)
calendars
event_calendar_memberships
  → primary_calendar_id
  → connected calendar ids
```

One canonical event; multiple calendar memberships; Command Calendar conflict detection across authorized layers.

---

## Roll-up rules (into Command Calendar)

| Mode | Use |
|------|-----|
| `FULL_DETAIL` | Candidate, Travel |
| `TITLE_ONLY` | Selected team items |
| `BUSY_ONLY` | Personal / protected for most viewers |
| `MILESTONES_ONLY` | Staff coverage gaps, major social deadlines |
| `DO_NOT_ROLL_UP` | Noise that must stay team-local |

Command Calendar must stay readable — not every minor action at equal weight.

---

## Layers and saved views

Layer toggles (map-style): Candidate, Travel, Events, Communications, Social, Volunteer, Fundraising, Staff, Compliance, …

Saved views examples: My Day · Public Campaign · Communications Week · Travel Only · County Events · Election Deadlines · Leadership Operations

---

## Calendar ownership metadata

Name · Purpose · Group · Owner · Managing team · Default visibility · Roll-up behavior · Visual identity · Allowed event types · Approval policy · External sync policy · Notification policy · Archive state

---

## Workflow-aware calendars (examples)

Not every item is a plain appointment:

- **Social:** draft → editorial → candidate approval → scheduled → published → performance  
- **Public event:** lead → tentative → details → review → candidate approved → confirmed → public announce  
- **Travel:** need → route → reservation → booked → confirmed → completed → expense  

---

## External sync (later — Step 23+)

Internal Command Calendar remains authoritative. Imports keep origin + sync status. Examples: Apple ↔ Kelly personal; Google Workspace ↔ staff; public ICS ← public events; Outlook ↔ communications. Never let an external calendar silently become master.

---

## Step 5 schema concepts (minimum)

```text
kccc_calendars
kccc_calendar_groups
kccc_calendar_memberships
kccc_calendar_permissions
kccc_calendar_rollup_rules
kccc_events
kccc_event_calendar_memberships
kccc_event_visibility
kccc_event_section_permissions
kccc_saved_calendar_views
kccc_calendar_external_connections
kccc_calendar_audit_log
```

Core path: `User → membership → calendar → event membership → event`

---

## Build-step impact

| Step | Broadening |
|------|------------|
| 3 | Feature flags for subcalendar modules; default-deny exposure (partially in place) |
| 4 | System roles + calendar/event/section membership permissions + availability-only |
| 5 | Full calendar registry, groups, roll-up, M2M events |
| 7 | Primary + connected calendars, visibility, roll-up at create |
| 8 | Today merges authorized layers |
| 10 | Layer controls, filters, saved views, legend |
| 13 | Tasks on source / assignee / event / command when leadership action required |
| 18 | Cross-calendar conflict analysis respecting permissions |
| 20 | NL questions across authorized calendars |
| 24 | Workload, coverage, bottlenecks, county gaps, comms readiness |

---

## Related standing policy

Weekday work blocks, vacation override, and Tuesday Little Rock default remain in `src/lib/campaign/availability-policy.ts` and materialize into the Personal/Protected and Candidate layers in Steps 5–10.
