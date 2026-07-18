# KCCC New Thread Handoff

```text
Product:
Kelly Campaign Command Calendar

Workspace:
H:\SOSWebsite\kelly-calendar

Shared database:
Existing RedDirt PostgreSQL database

RedDirt path:
H:\SOSWebsite\RedDirt

Completed:
KCCC-STEP-01-PRODUCT-CONSTITUTION
KCCC-STEP-02-APP-SCAFFOLD

Active application state:
Standalone Next.js application scaffolded
Mobile-first shell available
Health endpoint available
System status available
No calendar database tables yet
No authentication yet
No AI calls yet
No event creation yet

Next:
KCCC-STEP-03-ENV-SECURITY

Nonnegotiable boundaries:
- H-drive project storage only
- No RedDirt source changes
- No RedDirt database table mutation
- No migration until Step 5
- No real candidate schedule data
- No public calendar
- No external calendar synchronization
- No autonomous AI mutations
- No secret exposure
```

## Runtime / Git

- Local URL verified: `http://127.0.0.1:3000`
- Stack: Next.js 16.2.10 / React 19.2.7 / TypeScript 5.8.3
- DB diagnostic: PASS (read-only `SELECT 1`, hosted PostgreSQL via RedDirt env fallback)
- GitHub remote: present
- Netlify: blocked until Steve connects the site
