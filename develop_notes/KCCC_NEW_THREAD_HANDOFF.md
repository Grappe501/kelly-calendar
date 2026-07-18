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

Permanent calendar rule:
Protected events remain visible to authenticated campaign users as occupied time blocks.

Default limited display:
- Primary calendar name
- Safe event title
- General location when available and safe
- Start time
- End time

Protected details:
Removed server-side unless viewer is authorized.

Current capabilities:
- Standalone application
- Mobile-first shell
- Environment validation
- Safe RedDirt environment fallback
- Secret isolation
- Security headers
- Structured logging foundation
- Safe error foundation
- Read-only database diagnostics
- Standing availability policy (weekday blocks + Tuesday Little Rock)
- Calendar visibility doctrine
- Safe event-view contracts
- Visibility resolution prototype
- Demonstration visibility page (/system/visibility)

Not yet available:
- Authentication
- User roles
- Live calendar permissions
- Calendar tables
- Event creation
- Real candidate data
- AI event creation
- External calendar synchronization

Next:
KCCC-STEP-04-AUTH-RBAC
```

## Read first

1. `docs/MASTER_PRODUCT_CONSTITUTION.md` (v1.1.0)
2. `docs/CALENDAR_FEDERATION_ARCHITECTURE.md`
3. `develop_notes/KCCC_CALENDAR_VISIBILITY_DOCTRINE.md`
4. `docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md`

## Notes

- Netlify site still requires operator connection
- Do not begin Step 4 until this handoff is confirmed
- Step 5 seeds system calendars + materializes standing availability — no real PII
