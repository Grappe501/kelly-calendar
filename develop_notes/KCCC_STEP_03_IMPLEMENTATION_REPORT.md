# KCCC Step 3 — Implementation Report

**Status:** COMPLETE  
**Date:** 2026-07-18  
**Revision:** Visibility doctrine layer (KCCC-STEP-03-ENV-SECURITY-VISIBILITY-2.0)

## 1. Executive summary

Step 3 establishes the trusted environment and security foundation **and** the permanent calendar visibility doctrine:

- Typed public/server env validation, allowlisted RedDirt fallback, secret redaction
- Security headers/CSP staging, safe errors/logging/request IDs, cookie/redirect/origin foundations
- Read-only DB diagnostics (`SELECT 1` only)
- Standing availability policy (weekday work blocks + Tuesday Little Rock)
- **Visibility:** limited viewers always see occupied blocks with calendar name, safe title, general location, and times — protected fields never delivered to unauthorized clients

## 2. Visibility foundation

| Artifact | Path |
| --- | --- |
| Policy registry | `data/calendar_visibility_policy.json` |
| Resolver | `src/lib/calendar-security/resolve-event-visibility.ts` |
| Sanitizer | `src/lib/calendar-security/sanitize-event-for-viewer.ts` |
| Safe view contract | `src/lib/calendar-security/safe-event-view.ts` |
| UI block | `src/components/calendar/safe-event-block.tsx` |
| Demo page | `/system/visibility` |
| Status API | `GET /api/system/visibility` |

Default authenticated campaign visibility: **TITLE_LOCATION**.  
Protected personal fallback: **BUSY_ONLY**.  
Location default for limited viewers: **CITY**.

## 3. Environment / security

See sibling docs: `KCCC_ENVIRONMENT_ARCHITECTURE.md`, `KCCC_REDDIRT_ENV_FALLBACK_PROTOCOL.md`, `KCCC_SECRET_HANDLING_PROTOCOL.md`, `KCCC_SECURITY_HEADERS_AND_CSP.md`, `KCCC_SAFE_LOGGING_PROTOCOL.md`, `KCCC_ERROR_HANDLING_PROTOCOL.md`.

## 4. Progress

```text
Overall build:
[███░░░░░░░░░░░░░░░░░░░░░░] 12%

Steps complete:
3 of 25

Foundation phase:
[███████████████░░░░░░░░░░░] 60%

Environment foundation:
[█████████████████████████] 100%

Security foundation:
[█████████████████████████] 100%

Visibility doctrine:
[█████████████████████████] 100%

Visibility resolver prototype:
[█████████████████████████] 100%

Authentication and RBAC:
[░░░░░░░░░░░░░░░░░░░░░░░░░] 0%

Calendar database:
[░░░░░░░░░░░░░░░░░░░░░░░░░] 0%

Live subcalendars:
[░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
```

## 5. Exact next step

`KCCC-STEP-04-AUTH-RBAC` — do not begin until this pass is accepted.

## 6. Blockers

- Netlify site not connected (operator)
- CSP remains staged (`unsafe-inline`) — RISK-019
