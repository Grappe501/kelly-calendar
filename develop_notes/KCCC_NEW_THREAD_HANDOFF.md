# KCCC New Thread Handoff

```text
Product:
Kelly Campaign Command Calendar (federated)

Workspace:
H:\SOSWebsite\kelly-calendar

Shared database:
Existing RedDirt PostgreSQL database

RedDirt path:
H:\SOSWebsite\RedDirt

Completed:
KCCC-STEP-01-PRODUCT-CONSTITUTION
KCCC-STEP-02-APP-SCAFFOLD
KCCC-STEP-03-ENV-SECURITY
+ Constitution v1.1.0 / federation architecture amendment

Architecture (ratified):
- Command Calendar = authoritative roll-up
- Subcalendars = workspaces (travel, events, communications, social,
  press, field, county, fundraising, compliance, volunteer, debate,
  surrogate, staff work, personal/protected, …)
- Many-to-many event ↔ calendar memberships
- Calendar / event / section permissions + AVAILABILITY_ONLY
- Roll-up modes + layer toggles + saved views
- Standing availability: Mon–Fri work blocks (overrideable), Tuesday Little Rock

Current code capabilities:
- Standalone Next.js app + mobile shell
- Env/security foundation
- Standing availability policy encoded (not DB events yet)

Not yet available:
- Authentication / calendar memberships
- Calendar tables
- Event creation
- Real candidate data
- AI calls
- External calendar sync
- Public calendar

Next:
KCCC-STEP-04-AUTH-RBAC
(expand to system roles + calendar/event/section membership permissions)
```

## Read first

1. `docs/MASTER_PRODUCT_CONSTITUTION.md` (v1.1.0)
2. `docs/CALENDAR_FEDERATION_ARCHITECTURE.md`
3. `docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md` (v1.1.0)
4. `docs/ARCHITECTURE_RULES.md`

## Notes

- Netlify site still requires operator connection
- Step 5 seeds system calendars + materializes standing availability — no real PII
