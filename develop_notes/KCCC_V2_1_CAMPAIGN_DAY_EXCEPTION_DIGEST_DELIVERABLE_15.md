# KCCC V2.1 — Campaign Day Exception Digest (Deliverable 15)

**Status:** LIVE  
**Date:** 2026-07-20  
**Branch:** `main`  
**Migration:** `20260720150000_v21_campaign_day_exception_digest`  
**Validate:** `npm run missions:v21:exception-digest:validate`  
**Rollback:** `KCCC_V2_1_CAMPAIGN_DAY_EXCEPTION_DIGEST_DELIVERABLE_15_ROLLBACK.md`  
**Mobilize architecture:** `KCCC_V2_1_PROVIDER_INTEGRATION_MOBILIZE_ARCHITECTURE.md`

## What it is

Privacy-aware, **read-oriented** consolidation of active, carried-forward, overnight, post-Closeout, and post-digest-review incidents for Closeout and next-day Morning Launch Review.

It is **not** a ticket queue, SLA engine, emergency dispatch system, or incident mutation layer.

## Routes

| Route | Behavior |
|-------|----------|
| `/system/briefing/exceptions` | Campaign-local today → redirect |
| `/system/briefing/[date]/exceptions` | Digest workspace + explicit Complete Exception Review |
| `/system/briefing/[date]/exceptions/report` | Read-only privacy-aware report |
| `GET /api/briefing/[date]/exceptions` | Digest JSON |
| `POST /api/briefing/[date]/exceptions/review` | Lazy-create/refresh review metadata only |

## Model

- **Digest content:** derived from `MissionIncident` facts (never persisted as copied summaries).
- **Review metadata (optional):** `CampaignDayIncidentDigestReview` — lazy-created only on explicit Complete Exception Review.
  - Statuses: `DRAFT` | `REVIEWED` | `STALE`
  - Deterministic `sourceFingerprint`; material incident updates mark `STALE` without rewriting `reviewedAt`.
- **Mobilize foundation:** `ExternalProvider.MOBILIZE` + provider-neutral `ExternalObjectReference` (no network calls, no secrets, zero rows created by reads/builds).

## Invariants

- Completing digest review does **not** complete Closeout, Morning Launch Review, or day launch.
- Completing Closeout / Launch does **not** complete digest review or resolve/carry incidents.
- `ACKNOWLEDGED` does **not** clear blockers; `ACCEPTED_RISK` / `RESOLVED` / `NOT_APPLICABLE` may clear eligible presentation.
- Confidential incidents are omitted from restricted counts; narrative is redacted.
- No Mobilize API key required; sync failures cannot block local operation.
- Reads, builds, migrations, and validation create **zero** digest reviews, incidents, or external-sync rows unless an operator explicitly reviews.

## Navigation

Linked from Day Incident Board, Incident detail/workspace, Closeout (+ tomorrow preview), Morning Launch Review, Briefing, Today’s Mission, Command Center, Calendar day.

## Ship identifiers

Recorded after deploy in this note’s footer / follow-up docs commit.

## Recommended Deliverable 16

**Mobilize Integration Foundation** — authenticated server-only adapter, capability discovery, external identity mapping via `ExternalObjectReference`, dry-run reconciliation, and audit-safe imports **before** enabling outbound publishing. Verify all endpoints against official Mobilize documentation first.
