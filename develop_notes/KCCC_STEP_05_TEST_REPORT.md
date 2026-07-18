# KCCC Step 5 — Test Report

**Date:** 2026-07-18

## Unit tests

| Suite | Result |
|-------|--------|
| Prior Step 1–3 suites (15 files) | PASS |
| `tests/unit/database/mutation-gate.test.ts` | PASS (after server-only vitest shim) |
| `tests/unit/database/safe-event-projection.test.ts` | PASS |

Coverage includes: default-deny mutation gate; NO_ACCESS null projection; limited view (calendar + safe title + city + times; private notes omitted); protected personal BUSY_ONLY.

## Integration / transaction tests

| Area | Result |
|------|--------|
| Live create/update/archive against DB | BLOCKED (mutations unauthorized) |
| Import approval transaction | BLOCKED (auth) |
| Version conflict 409 | Schema field present; live path gated |

## Schema / integrity

| Check | Result |
|-------|--------|
| `db:schema:verify` | PASS (60 tables, none in public) |
| RedDirt before/after signature | PASS (diff 0) |
| `db:seed:reference` idempotent | PASS |
| `db:drift` full migrate-diff | BLOCKED (no SHADOW_DATABASE_URL); soft-pass with operator note |
| `auth:validate` | FAIL/BLOCKED (expected — Step 4) |

## Quality commands

| Command | Result |
|---------|--------|
| typecheck | PASS |
| lint | PASS (after prefer-const / unused fixes) |
| test | PASS |
| build | PASS |
| step5:validate | PASS (with honest auth flags) |

## E2E

`npm run test:e2e` — not required for schema closeout; Netlify site still operator-blocked.
