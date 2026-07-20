# KCCC V2.1 — Mobilize Event Publishing and Bidirectional Reconciliation (Deliverable 17)

**Status:** Live on `main`  
**Feature commit:** `8e1fc60`  
**Deploy ID:** `6a5e6e26e76a19a84a484788` · https://kelly-calendar.netlify.app  
**Baseline:** D16 `main` @ `db1a826` · 210 tests · Mobilize `NOT_CONFIGURED` · 0 fabricated integration records  
**D1–D17 validation:** 222 tests passed  
**Counts after ship:** Missions 37 · Events 38 · publications/approvals/attempts/refs/connections/runs 0 · remotely published 0 · fabricated 0  
**Credential-tested writes:** Pending — no Mobilize API key available  


## Official API documentation (reverified)

| Field | Value |
|--|--|
| Repository | https://github.com/mobilizeamerica/api |
| Revision inspected | `1025d0f` (`1025d0f8920f9484f4e68368c0f403c8b68a3e92`) |
| Commit date | 2024-03-27 |
| Inspection date (D17) | 2026-07-20 |
| Auth | Bearer token over HTTPS |
| Rate limits (docs) | 15 read/s · 5 write/s · 429 |
| Create | `POST /v1/organizations/:organization_id/events` (RESTRICTED) |
| Update | `PUT /v1/organizations/:organization_id/events/:event_id` (RESTRICTED) |
| Delete | `DELETE /v1/organizations/:organization_id/events/:event_id` (RESTRICTED) |
| Required create fields | `title`, `description`, `timeslots`, `timezone`, `event_type`, `visibility`, `contact` |
| Optional | `location` (postal_code required if not virtual), `is_virtual`, `virtual_action_url`, `address_visibility`, accessibility, instructions, tags, featured_image_url |
| Timeslots | Unix `start_date`/`end_date`; optional `max_attendees`, `instructions`; update with `id` to mutate; omitted upcoming slots deleted on PUT |
| Timezones (write) | `America/New_York`, `Pacific/Honolulu`, `America/Los_Angeles`, `America/Denver`, `America/Phoenix`, `America/Chicago` |
| Visibility | `PUBLIC` \| `PRIVATE` |
| Address visibility | `PUBLIC` \| `PRIVATE` |
| Private instructions | `instructions` sent to attendees after signup — not public description |
| Images | `featured_image_url` must come from `POST /v1/images` — **disabled in D17** |
| Contact note | Docs Contact table typo `email_adddress`; KCCC sends `email_address` |
| Live write behavior | **Not credential-tested** — no API key available during D17 |

Unknown future `event_type` values are preserved as REQUIRES_DECISION — never auto-invented. `ADVOCACY_CALL` create/update is UNSUPPORTED per docs.

## System-of-record rules

- Kelly Calendar is authoritative for local Event and Mission operations.
- Mobilize is authoritative for Mobilize object identity and observed remote state.
- Publishing an Event does **not** create a Mission.
- Creating a Mission does **not** publish an Event.
- Mission changes do not automatically update Mobilize.
- Mobilize changes do not silently overwrite local Event/Mission data.
- Remote delete does not delete local Events/Missions.
- Local cancellation does not delete remotely.
- Person / attendance / affiliation / image writes remain disabled.

## Models / migration

Migration: `20260720170000_v21_mobilize_event_publishing`

- `ExternalPublication` — status, fingerprints, mapping version, conflict/outcome
- `ExternalPublicationApproval` — fingerprint-bound, consumable approvals
- `ExternalPublicationAttempt` — idempotency key, unknown-outcome tracking

Mapping version: `kccc-mobilize-map-d17.1`  
Adapter version: `kccc-mobilize-adapter-d17.1`

## Enablement flags (server-only)

| Env | Default | Meaning |
|--|--|--|
| `MOBILIZE_API_KEY` | unset | Credentials |
| `MOBILIZE_ORGANIZATION_ID` | unset | Target org |
| `MOBILIZE_PUBLISHING_ENABLED` | off | Application create |
| `MOBILIZE_UPDATES_ENABLED` | off | Application update |
| `MOBILIZE_DELETE_ENABLED` | off | Application delete (still blocked in D17 prod path) |
| `MOBILIZE_DEFAULT_CONTACT_EMAIL` | unset | Explicit contact for mapping — never invented |

Never `NEXT_PUBLIC_MOBILIZE_*`.

## Workflow

1. Eligibility → 2. Preview (no remote write) → 3. Approve (binds fingerprints) → 4. Publish/Update (one remote write) → 5. Reconcile returned object → 6. Store reference + audit  

Stale local/payload/org/mapping invalidates approval. Create never blind-retries; timeouts → `UNKNOWN_REMOTE_OUTCOME`.

## Routes

### Pages
- `/system/integrations/mobilize/publishing`
- `/system/integrations/mobilize/publishing/[eventId]`
- `/system/integrations/mobilize/conflicts`

### APIs
- `GET /api/integrations/mobilize/publishing`
- `GET /api/integrations/mobilize/publishing/conflicts`
- `GET|POST /api/integrations/mobilize/publishing/[eventId]` (`preview` \| `approve` \| `publish`)
- `POST .../refresh`
- `POST .../resolve-conflict`
- `GET .../history`

## Privacy exclusions (never published)

Internal Mission instructions, Travel/drivers/passengers, Logistics, Field Ops, Incidents, Exception Digest, confidential notes, unapproved personal contacts, `privateNotes`, `internalTitle`, campaign-only descriptions.

## Validation

```bash
npm run missions:v21:mobilize-publishing:validate
```

D17 unit file: `tests/unit/missions/v21-mobilize-publishing.test.ts` (12 tests).  
D1–D17 total: **222** passed at ship validation.

## Counts (no key)

Builds/previews/validation create **0** remote Mobilize events. Fabricated references: **0**.

## Rollback

See `KCCC_V2_1_MOBILIZE_EVENT_PUBLISHING_DELIVERABLE_17_ROLLBACK.md`.

## Recommended D18

**Mobilize Signup and Attendance Read Integration** — privacy-scoped RSVP/attendance ingestion, consent-aware identity matching, aggregate Mission staffing views, cancellation reconciliation, and explicit check-in correlation without treating signup as attendance or attendance as Mission execution.
