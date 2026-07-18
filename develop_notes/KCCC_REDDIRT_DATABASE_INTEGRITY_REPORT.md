# KCCC RedDirt Database Integrity Report

**Date:** 2026-07-18  
**Workspace:** `H:\SOSWebsite\kelly-calendar`

## Result

| Check | Result |
|-------|--------|
| RedDirt source files modified by KCCC | **No** |
| RedDirt migrations modified | **No** |
| RedDirt-owned DB objects modified | **No** |
| Structural before/after difference | **0** |

## Signatures

| Snapshot | Column signature |
|----------|------------------|
| Before foundation migration | `d6943a2c72055cbbf81a4685ffe3c64e2db606f76dd66f7ab638070ecb4ac6b2` |
| After foundation migration | `d6943a2c72055cbbf81a4685ffe3c64e2db606f76dd66f7ab638070ecb4ac6b2` |

Proof artifacts:

- `develop_notes/database_proofs/reddirt-structure-before.json`
- `develop_notes/database_proofs/reddirt-structure-after.json`
- `develop_notes/database_proofs/reddirt-integrity-latest.json` (after `npm run db:reddirt:integrity`)

## Method

Non-`kelly_calendar` schemas are hashed by table/column signatures only. No row data is captured.

## Boundary

Kelly Calendar may share the PostgreSQL server. It owns only `kelly_calendar.*`.
