# Step 5.6 Test Report

**Date:** 2026-07-18

## Unit tests

- Command: `npm run test`
- Result: **91 passed** (baseline was 88; +3 auth/actor/authorization coverage)

## Step 5.6 validators

| Command | Result |
| --- | --- |
| `auth:actor:validate` | PASS |
| `auth:routes:validate` | PASS (after draft/import route wrap) |
| `rbac:matrix:validate` | PASS |
| `mutations:validate` | PASS |
| `mutations:transactions` | PASS |
| `mutations:concurrency` | PASS |
| `protection:cross-section` | PASS |
| `session:security:validate` | PASS |
| `step5.6:validate` | PASS |
| `step5.6:readiness` | PASS |

## Quality

| Command | Result |
| --- | --- |
| lint | PASS |
| typecheck | PASS |
| build | PASS |
| db:reddirt:integrity | PASS (structuralDifference 0) |

## Not claimed as live e2e

Forced mid-transaction DB failure injection and full browser matrix are structural/validator covered; operator should smoke local login with seed users before enabling Netlify.
