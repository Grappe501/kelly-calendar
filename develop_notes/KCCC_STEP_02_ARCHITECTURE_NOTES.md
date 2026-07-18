# Step 2 Architecture Notes

## Decisions locked

- Next.js 16 App Router + TypeScript (ADR-009)
- No Prisma models until Step 5 (ADR-010)
- Development shell before auth (ADR-011)
- Read-only `SELECT 1` DB probe only (ADR-012)
- Bottom nav: Today / Calendar / Add / Search / More (ADR-013)
- Configurable election date `NEXT_PUBLIC_ELECTION_DATE` (ADR-014)

## Layering

```text
UI (app shell + pages)
  → Route handlers (health/status)
  → lib (env presence, dates, capabilities)
  → scripts (diagnostics / governance validators)
```

## Deliberate non-goals

- No event domain services yet
- No OpenAI client
- No Supabase auth client wiring
- No service worker / offline cache yet (Step 22)
