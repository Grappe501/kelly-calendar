# KCCC EA-8 — Security Closeout Plan

```text
Build: KCCC-EA-8-SECURITY-CLOSEOUT-1.0
Parent recovery: KCCC-CALENDAR-RECOVERY-RETURN-TO-CORE-1.0
Date: 2026-07-21
Goal: Make Authentication complete: true AND Candidate-data ready: true
Scope: Narrow closeout — not a new security architecture
Status: COMPLETE — see KCCC_EA_8_SECURITY_CLOSEOUT_EVIDENCE.md
```

## Context

EA-8 engineering audit was already assessed and accepted (`EA8_STATUS=COMPLETE` in constants).  
**Product gates are still open:**

| Flag | Current | Source |
|------|---------|--------|
| `authenticationComplete` | true when `APP_SESSION_SECRET` ≥ 32 chars | `src/lib/auth/auth-flags.ts` |
| Status UI “Authentication complete” | often hardcoded `false` | `system-status-dashboard.tsx` |
| `candidateDataReady` | **always false** | `auth-flags.ts`, `security-status.ts`, APIs |
| Real schedule entry | prohibited | status/add copy + flags |

This closeout makes the **product gate** match a certified security posture.

---

## Smallest legitimate scope

### Slice A — Authentication proven (not redesigned)

**Provider / session (already exists — prove it):**

- Email/password login → HMAC session cookie → `AuthSession` row
- Middleware redirects unauthenticated HTML; APIs return 401
- Logout revokes session

**Prove:**

1. `/login` succeeds with seeded operator user when secret configured.
2. Protected HTML routes redirect to login when logged out.
3. Protected APIs return 401/403 when logged out / unauthorized.
4. `/api/auth/status` reports `authenticationComplete: true` with secret present.
5. Status dashboard uses **live flags**, not hardcoded `false`.

**Do not:** migrate to a new IdP, rewrite RBAC, or expand roles.

### Slice B — Authorization inventory (document + spot-fix)

| Layer | Inventory owner |
|-------|-----------------|
| Middleware public paths | `src/lib/auth/public-paths.ts` |
| Role catalog | `src/lib/auth/system-roles.ts` |
| Action authorize | `src/server/auth/authorization.ts` |
| Calendar access | `can-access-calendar.ts` |
| Event access | `can-access-event.ts` |
| Mutation wrappers | `api-mutation.ts` |

**Least privilege rules (confirm, do not invent):**

| Role | Schedule visibility intent |
|------|----------------------------|
| KELLY / CAMPAIGN_MANAGER | Broad campaign schedule |
| SCHEDULER | Create/edit within memberships |
| STAFF | Assigned / membership sections |
| VOLUNTEER / READ_ONLY_ADVISOR | Narrow / availability-aware |
| Public unauthenticated | Public calendars / public events only |

**Unauthorized behavior:** fail closed (401/403/redirect). No silent empty “success.”

### Slice C — Candidate-data certification

Certification checklist (all required before flipping flags):

```text
[ ] Auth Slice A proven on production deploy
[ ] Protected route + API spot-check pass
[ ] Visibility policy validated (npm run visibility:validate)
[ ] Secret scan + client-bundle scan pass
[ ] No real candidate PII currently stored that violates policy
[ ] Operator acceptance: Steve + Kelly
[ ] Explicit gate flip change in auth-flags / security-status / auth-status
[ ] Status UI shows Candidate-data ready: true only after flip
[ ] Audit log path confirmed for schedule mutations
```

Until then:

```text
candidateDataReady = false
candidateDataEntryAuthorized = false
```

### Slice D — Honesty + docs

- Replace hardcoded auth/candidate rows on `/system/status` with capability values.
- Align README “active step” with recovery roadmap Step 8.
- Mark communications frozen on status (not dominant).

### Out of scope

- Resend / LG-1 / D27
- New migrations unless a defect blocks certification
- Full hardening ledger (HL-031+) — only items that block candidate-data certification
- Communications UI work

---

## Audit logging

Preserve `AuditLog` / `DataAccessLog`. Closeout requires that schedule create/edit/archive write attribution when mutations are authorized — no secret values in logs.

## Secret handling

- Secrets only in `.env.local` / Netlify env
- Never chat, Git, Markdown, screenshots
- `APP_SESSION_SECRET` remains required (≥ 32)

## Test requirements

```text
npm run auth:validate
npm run auth:routes:validate
npm run visibility:validate
npm run secret:scan
npm run security:bundle
npm run netlify:fail-closed:validate
npm run typecheck
npm run build
```

Plus targeted unit tests for flag flip (candidate-data remains false until certification commit).

## Migration requirements

None expected. If a missing permission column blocks enforcement, additive migration only with rollback note.

## Rollback

1. Revert gate-flip commit → `candidateDataReady` false again.
2. Redeploy.
3. Keep auth infrastructure intact.

## Acceptance criteria

```text
Authentication complete: true (live, not hardcoded)
Candidate-data ready: true (only after checklist + acceptance)
Unauthorized APIs fail closed
Public/private boundaries enforced per visibility policy
Real schedule data permitted for authorized roles
Communications still production-blocked
Status page primary message = calendar foundation, not communications
```

## Estimated implementation slices

```text
1. Status honesty + live auth flags on dashboard
2. Auth/route/API proof script or checklist evidence
3. Candidate-data certification checklist + gate flip
4. README / roadmap alignment commit
```

## Next after acceptance

```text
KCCC-EA-9-CANONICAL-CALENDAR-DATA-MODEL-1.0
```
