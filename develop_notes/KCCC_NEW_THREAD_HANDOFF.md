# KCCC New Thread Handoff

```text
Product:
Kelly Campaign Command Calendar

Workspace:
H:\SOSWebsite\kelly-calendar

Shared PostgreSQL database:
Existing RedDirt database infrastructure (hosted)

Owned schema:
kelly_calendar

Completed:
KCCC-STEP-01-PRODUCT-CONSTITUTION
KCCC-STEP-02-APP-SCAFFOLD
KCCC-STEP-03-SECURE-INGEST-FAST-ENTRY

Partial (schema foundation; auth-gated):
KCCC-STEP-05-DATABASE-FEDERATED-CALENDAR

NOT completed:
KCCC-STEP-04-AUTH-RBAC

Migrations applied:
- 20260718160000_kelly_calendar_foundation
- 20260718163000_kelly_calendar_additive_fields

Database capabilities (schema + seed):
- Dedicated application schema kelly_calendar (60 tables)
- Command Calendar roll-up surface + 16 specialized calendars
- Calendar groups, memberships, team bindings, roll-up rules, saved views
- Canonical events + event numbers + multi-calendar memberships
- Visibility overrides + section permissions
- Operational plans (objectives, program flow, packing, staffing, actions, communications, travel)
- People/organizations with externalCrmId linkage fields
- 75 Arkansas counties + regions
- Historical Google import persistence + external identities
- Import approval transaction contracts (mutations gated)
- Templates, approvals, audit, AI suggestion tables
- Protected APIs return 401 until Step 4

Permanent limited-view rule:
- Primary calendar name
- Safe event title
- General location when safe
- Start / end times

Historical floor:
November 1, 2025

Database target:
Hosted PostgreSQL (Supabase pooler) — credentials redacted

RedDirt integrity:
Structural before/after difference: 0

Live flags (honest):
- authentication_complete: false
- database_mutations_authorized: false
- candidate_data_ready: false
- live_calendar_data_enabled: false

Missing Step 4 gates:
- Auth provider module
- session.ts identity contract
- System roles
- Team memberships
- Session validation
- Protected route middleware (beyond mutation gate)

Next required:
KCCC-STEP-04-AUTH-RBAC

Then resume Step 5 live mutation wiring.

Do not begin:
KCCC-STEP-06-MOBILE-COMMAND-SHELL

Netlify:
Operator site connection still required

Blockers:
1. Step 4 authentication / RBAC
2. Netlify site + injected env
3. Optional SHADOW_DATABASE_URL for full migrate-diff
```
