# EA-8 Security Audit

**Script ID:** `KCCC-EA-8-SECURITY`  
**Parent:** `KCCC_ENGINEERING_AUDIT.md` · `KCCC_AUDIT_CONSTITUTION.md`  
**Status:** COMPLETE  
**Assessment:** **PASS WITH FINDINGS**  
**Nature:** Evidence-only · **no behavior changes**  
**Feature Freeze:** ACTIVE  
**Governing question:**

> Can every operation and data surface enforce the intended trust boundaries without exposing or implying unauthorized access or capabilities?

**Evidence date:** 2026-07-19  

---

## Executive Verdict

```text
EA-8 Security

Status .................... PASS WITH FINDINGS

Governance Compliance ..... PASS

Architecture .............. PRESERVED

Feature Freeze ............ HONORED

Behavior Changes .......... NONE

Security Strategy ......... HARDENING (+ Foundation for projection-aware context)

Core mutation paths ....... STRONG

Calendar enrichment ....... CRITICAL GAP (SEC-002)

API / session edges ....... LOCALIZED GAPS
```

Findings are **enforcement and capability-truth gaps in implementation**, not a failure of the Architecture 1.0 trust model (RBAC + safe projections + default deny). Remediation belongs in Hardening / Foundation — not redesign of ownership.

---

## Security Profile

| Surface | Assessment |
|---------|------------|
| Event get / mutate via `canAccessEvent` + `authorize` | **Strong** |
| Safe event projections (`projectSafeEvent`) | **Present** · level mapping incomplete (SEC-001/003/004) |
| Day / Week / Month assembly | **Critical gap** — mission context loads without access level (SEC-002) |
| Conflict acknowledge | **High** — role-scoped, not event/calendar-scoped (SEC-005) |
| Conflict override | Leadership-gated (stronger than ack) |
| Calendar catalog API | Edge cookie only · lists all active calendars (SEC-006) |
| System diagnostic APIs | Edge cookie only · no RBAC (SEC-006) |
| Admin debug pages | System-admin gated · no raw secrets (PASS) |
| Session cookie (Node path) | HMAC · httpOnly · revoke/expiry/active checks (PASS) |
| Session secret policy | Strong classifier · inconsistent edge/status application (SEC-007) |
| Local env fallback | Default RedDirt fill of approved keys outside production (SEC-008) |
| Unwired mutation stubs | Fail closed 401/501 (PASS) |

---

## Boundary Findings

### SEC-001 — `AVAILABILITY_ONLY` projects title and location

| Field | Value |
|-------|-------|
| **Evidence** | `event-visibility-service.ts` maps non-personal limited access (`AVAILABILITY_ONLY` \| `VIEW_LIMITED`) to `TITLE_LOCATION`, returning campaign title and city-level location — not busy/time-only |
| **Risk** | Minimally authorized members learn mission identity and location |
| **Governance** | Least privilege · calendar confidentiality · availability-vs-content |
| **Phase** | Hardening |
| **Priority** | High |
| **Owner** | Event visibility / projection |
| **Verify** | `AVAILABILITY_ONLY` actor sees timing/busy only — no title/location |
| **Class** | Enforcement gap |

### SEC-002 — Calendar enrichment bypasses projection boundaries

| Field | Value |
|-------|-------|
| **Evidence** | Day/Week/Month call `listEventsForActor`, then `loadMissionContextForIds(eventIds)` with **no actor / access level**. Loader `prisma.event.findMany` includes objectives, staffing, travel, communications, people, orgs, etc. Cards receive readiness, travel, arrival, confirmation via `toMissionCard` |
| **Risk** | Limited / availability viewers can receive operational detail beyond the safe projection — **all three views** share the pattern |
| **Governance** | Trust boundaries · section confidentiality · cross-view security consistency |
| **Phase** | **Foundation** (permission-aware context contract) · interim Hardening guard if needed |
| **Priority** | **Critical** |
| **Owner** | Mission-context + calendar assembly |
| **Verify** | Compare Day/Week/Month (and command-summary consumers) for AVAILABILITY_ONLY / VIEW_LIMITED / VIEW_FULL / CONTRIBUTE — protected context absent unless authorized |
| **Class** | Enforcement gap |

### SEC-003 — Related-calendar access reveals primary calendar metadata

| Field | Value |
|-------|-------|
| **Evidence** | `canAccessEvent` allows access via primary **or** related memberships; `projectSafeEvent` always emits `primaryCalendar.id/name/type` |
| **Risk** | Related-calendar grant discloses otherwise inaccessible primary calendar identity |
| **Governance** | Calendar isolation · metadata minimization |
| **Phase** | Hardening |
| **Priority** | High |
| **Owner** | Visibility policy |
| **Verify** | Related-only membership does not expose inaccessible primary calendar identifiers/names |
| **Class** | Enforcement gap |

### SEC-004 — Capabilities overstate server authorization

| Field | Value |
|-------|-------|
| **Evidence** | Projection sets `canArchive` (and section caps) true whenever not `limited`; `authorize` requires EDIT rank for `EVENT_ARCHIVE`. Day View offers mission-day actions via `roleMayMutate` while server requires event-level `EVENT_EDIT` |
| **Risk** | UI implies authority the server will deny |
| **Governance** | Capability truthfulness · predictable RBAC |
| **Phase** | Hardening |
| **Priority** | Medium |
| **Owner** | Capability projection + calendar UI |
| **Verify** | Every displayed capability matches `authorize` outcome for VIEW_FULL / CONTRIBUTE |
| **Class** | Presentation-of-capability gap |

---

## Exposure Risks

### SEC-005 — Conflict acknowledge not resource-scoped

| Field | Value |
|-------|-------|
| **Evidence** | `authorization.ts` allows `CONFLICT_ACKNOWLEDGE` for mutator roles (or READ_ONLY_ADVISOR for view/ack path) without `canAccessEvent` on the conflict’s event; `acknowledgeConflict` authorizes then mutates by `conflictId` alone |
| **Risk** | Mutator with a conflict ID can acknowledge conflicts outside their calendars |
| **Governance** | Resource-scoped authorization · audit trustworthiness |
| **Phase** | Foundation |
| **Priority** | High |
| **Owner** | Operational-conflict authorization |
| **Verify** | Cross-calendar ack attempt → 403 · no action/audit row |
| **Class** | Enforcement gap |

### SEC-006 — Catalog and diagnostic APIs trust edge cookie only

| Field | Value |
|-------|-------|
| **Evidence** | Middleware validates HMAC + expiry only; revocation/role in `getSessionViewer`. `/api/calendars` lists all active calendars with no actor membership filter. `/api/system/status`, `/security`, `/environment` lack RBAC; status runs DB diagnostic |
| **Risk** | Revoked-but-unexpired cookie or low-privilege session can read catalog/diagnostics |
| **Governance** | Session revocation · system-information minimization |
| **Phase** | Hardening |
| **Priority** | High |
| **Owner** | API auth + observability |
| **Verify** | Revoked session → 401/403; volunteer denied diagnostics and unauthorized catalog rows |
| **Class** | Enforcement gap |

---

## Authorization Findings

### SEC-007 — Production session-secret policy inconsistently applied

| Field | Value |
|-------|-------|
| **Evidence** | `session-secret-policy.ts` rejects forbidden production secrets; Node cookie encode/decode asserts policy. Edge decode and some “configured” status paths accept any 32+ character secret |
| **Risk** | Edge admission / status can diverge from Node fail-closed behavior |
| **Governance** | Production-secret policy · fail-closed auth |
| **Phase** | Foundation |
| **Priority** | High |
| **Owner** | Authentication platform |
| **Verify** | Forbidden 32+ secret fails closed consistently across provider, middleware, and session |
| **Class** | Enforcement gap |

### SEC-008 — Local RedDirt env fallback can import cross-product credentials

| Field | Value |
|-------|-------|
| **Evidence** | `load-server-environment.ts` defaults RedDirt fallback **on** outside production; allowlist includes `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_SESSION_SECRET` |
| **Risk** | Local calendar process may silently adopt another product’s DB/session credentials — isolation not guaranteed |
| **Governance** | Product data isolation · credential tenancy (lane rules) |
| **Phase** | Foundation |
| **Priority** | High |
| **Owner** | Deployment / environment governance |
| **Verify** | Calendar-absent + RedDirt-present local setup does not source credentials unless explicit authorized mode |
| **Class** | Enforcement gap |

---

## Strong / PASS (do not regress)

- Event detail retrieval revalidates session + `canAccessEvent` before projection.
- Event create/edit/archive/restore and membership mutations use resource-level authorization, versions, and attributed audit.
- Mission-day mutations require event-level `EVENT_EDIT`.
- Unwired calendar/conflict routes fail closed (401/501).
- Server sessions: signed token · DB session · revocation · expiry · active user · role.
- Cookies: httpOnly · Secure in production · SameSite=Lax · HMAC.
- Admin auth-debug / permissions / audit pages require system admin; no raw cookie/secret dump.
- `.env*` gitignored; no secret values inspected or recorded in this audit.

---

## Hardening Candidates

| Ledger | Source | Summary |
|--------|--------|---------|
| HL-031 | SEC-002 | **Critical** — stop enriching limited projections with unrestricted mission context (Wave 1 safety; full contract → Foundation) |
| HL-032 | SEC-001 | Map `AVAILABILITY_ONLY` to busy/time-only projection |
| HL-033 | SEC-003 | Minimize primary-calendar metadata for related-only grants |
| HL-034 | SEC-004 | Align capability flags / mission-day affordances with `authorize` |
| HL-036 | SEC-006 | Actor + RBAC on catalog and system diagnostic endpoints; honor revocation |

---

## Foundation Candidates

| Ledger | Source | Summary |
|--------|--------|---------|
| HL-031 | SEC-002 | Permission-aware `loadMissionContext*` / shared assembly contract (EA-3 + EA-6 + EA-8) |
| HL-035 | SEC-005 | Conflict mutations scoped to authorized event/calendar |
| HL-037 | SEC-007 | Unified production secret policy across edge + Node + status |
| HL-038 | SEC-008 | Explicit per-product env isolation (opt-in cross-lane only) |

---

## Deliverables check

```text
Security Profile .............. YES
Boundary Findings ............. YES
Exposure Risks ................ YES
Authorization Findings ........ YES
Hardening Candidates .......... YES
Foundation Candidates ......... YES
No Behavior Changes ........... YES
```

---

## Cross-audit correlation

| Theme | Audits |
|-------|--------|
| Architecture sound | EA-1 · EA-3 · EA-6 · EA-7 · **EA-8** |
| Trust boundary enforcement | EA-1 · EA-7 · **EA-8** |
| Shared assembly / Foundation | EA-3 · EA-6 · EA-7 · **EA-8** (permission-aware context) |
| Hardening before Redesign | EA-2 · EA-5 · EA-6 · EA-7 · **EA-8** |
| Never Fake / honesty | EA-7 (presentation) · **EA-8** (capability truth SEC-004) |

---

## Metrics

| Metric | Effect |
|--------|--------|
| Architecture Fitness | Held — model intact; enforcement incomplete |
| OCI | ↑ after HL-031/032 honesty of what operators can see |
| ESI | ↑ via shared permission-aware context (Foundation) |
| Trust Model | Intact as doctrine; SEC-002 is the dangerous enforcement exception |

**Did we follow the governance?** **Yes.**

---

## Recommendation

Accept EA-8. Treat **HL-031 (SEC-002)** as Wave 1 Architectural Safety alongside **HL-001**. No inline fixes during audit.

## Architecture 1.0 Conformance Statement

EA-8 does not amend Architecture 1.0. Security fixes must enforce existing ownership and projection rules — not invent new authority paths or weaken default deny.
