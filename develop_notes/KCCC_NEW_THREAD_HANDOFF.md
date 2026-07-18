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

Database capabilities (schema + seed):
- Dedicated application schema kelly_calendar
- Command Calendar (roll-up surface)
- Specialized subcalendars (17 system calendars)
- Calendar groups
- User and team membership tables
- Calendar permissions vocabulary
- Event-level visibility overrides
- Section-level permissions
- Canonical events + event numbers
- Many-to-many calendar memberships
- Event objectives, program flows, packing, staffing, actions
- Communications and travel plans
- People and organizations
- Arkansas county references (75)
- Historical Google import persistence tables
- External identity preservation
- Import approval transaction contracts (mutations gated)
- Event templates + saved views
- Approval workflows + audit + AI suggestion tables

Permanent limited-view rule:
Authenticated campaign users normally see:
- Primary calendar name
- Safe event title
- General location when safe
- Start time
- End time

Protected sections:
Removed server-side unless authorized.

Historical floor:
November 1, 2025

Migration applied:
20260718160000_kelly_calendar_foundation

Database target:
Hosted PostgreSQL (Supabase pooler) — credentials redacted

RedDirt integrity:
Structural before/after difference: 0

Live flags (honest):
- authentication_complete: false
- database_mutations_authorized: false
- candidate_data_ready: false
- live_calendar_data_enabled: false

Next required:
KCCC-STEP-04-AUTH-RBAC

Then resume:
Wire Step 5 mutation services + import approval + Command Calendar membership queries

Do not begin:
KCCC-STEP-06-MOBILE-COMMAND-SHELL

Netlify:
Operator site connection still required

Blockers:
1. Step 4 authentication / RBAC
2. Netlify site + injected env
3. Optional SHADOW_DATABASE_URL for full migrate-diff drift CI
```
