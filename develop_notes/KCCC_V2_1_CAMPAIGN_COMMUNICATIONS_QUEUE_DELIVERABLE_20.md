# KCCC V2.1 — Campaign Communications and Mobilization Queue (Deliverable 20)

**Status:** Live on `main` (pending deploy-docs)  
**Feature commit:** pending  
**Deploy ID:** pending · https://kelly-calendar.netlify.app  
**Baseline:** D19 `main` @ `6422591` · deploy-docs `06164b1` · Netlify `6a5e78e3cbc466ee73d04534` · 241 tests · D18 observations/matches/correlations 0 · staffing rows 0  
**D1–D20 validation:** 252 tests passed (`npm run missions:v21:communications:validate`; D20 adds 11)  
**Counts after migration/build:** Missions 37 · Events 38 · D18 observations/matches/correlations 0 · local people 0 · D19 staffing rows 0 · **D20 policy / contact points / evidence / suppressions / communications / audience / approvals / queue / delivery events 0** · fabricated **0** · externally sent **0**  
**External send:** **DISABLED** — no email/SMS provider configured; Mobilize has no general messaging API  
**Mobilize messaging:** Links only via verified `ExternalObjectReference` — never outbound send through Mobilize  

## Product purpose

Campaign-scoped **consent-aware communication planning**: versioned policy, contact points, documented consent evidence, suppressions, audience review, separate content and audience approval, queue preparation, **export**, and **manual handoff** — without auto-consent, auto-send, fabricated delivery, or treating RSVP / attendance / staffing / check-in as consent.

Communications support operational outreach planning tied to Missions, staffing context, and Mobilize event links. They do **not** mutate Prepare, Execute, Debrief, Follow-up, Travel, Logistics, Field Ops, Incidents, Launch, Closeout, or staffing assignment state.

## Deliberate exclusions (v1)

- No auto-consent from Mobilize RSVP, attendance, staffing assignments, check-in, or campaign participation
- No auto-send email, SMS, or in-app delivery
- No fabricated delivery events or “sent” status without provider or operator-recorded facts
- No Mobilize general messaging API (Mobilize is event/signup/attendance — not a comms provider in D20)
- No aggregate Mobilize records as person-level audience members
- No Person auto-create from audience materialization
- No operator attestation by default (`allowOperatorAttestation: false`)
- `attemptProviderDispatch` always blocked via `DisabledCommunicationProviderAdapter`
- Page loads, build, validation, and navigation do **not** lazy-create communications or policy rows

## Allowed in D20

| Capability | Rule |
|------------|------|
| Draft | Create communication with explicit channel + purpose |
| Audience review | Materialize candidates from explicit sources; operator inclusion/exclusion |
| Content approval | Separate fingerprinted approval from audience approval |
| Queue prepare | Idempotent queue items for **included** members only |
| Export | CSV preview of prepared queue — **export ≠ sent ≠ delivered** |
| Manual handoff | Record handoff label for prepared items — **not delivery proof** |
| Consent evidence | Operator-recorded, channel- and purpose-specific |
| Suppression | Operator-recorded opt-out / do-not-contact / policy holds |
| Mobilize event link | URL + verified local `ExternalObjectReference` only |

## Not allowed in D20

| Action | Rule |
|--------|------|
| Auto-consent | Never from operational signals |
| Auto-send | `externalDispatchEnabled` defaults false; adapter dispatch returns `DISABLED` |
| Fabricate delivery | No synthetic `DELIVERED` without provider/manual/import source |
| RSVP → consent | Warning `SOURCE_NOT_CONSENT:*` only |
| Attendance → consent | Same |
| Staffing → consent | Staffing assignments are **relevance** candidates only |
| Check-in → consent | Same |
| Mobilize `sms_opt_in_status` → consent | Denied — see privacy guide |
| Provider dispatch | Blocked until D21 foundation |

## Semantics

| Concept | Rule |
|---------|------|
| Contact point | Normalized destination + masked display + verification state — **≠ consent** |
| Consent evidence | Channel **and** purpose specific; `UNKNOWN` is never positive |
| Suppression | Evaluated **before** positive eligibility |
| Audience member | Candidate with eligibility fingerprint — inclusion is operator-owned |
| `EXCEPTION_INCLUDED` | Explicit operator override with note — still subject to queue re-check |
| Queue item `PREPARED` | Eligible at prepare time — **not sent** |
| Queue item `EXPORTED` | Left Kelly Calendar controls — **not delivery** |
| Queue item `HANDED_OFF` | Manual transfer recorded — **not delivery** |
| Content / audience fingerprint | Change invalidates matching approvals → `STALE` where applicable |

## Default policy (conservative)

Seeded on first intentional policy ensure only:

| Setting | Default |
|---------|---------|
| `externalDispatchEnabled` | `false` |
| `allowOperatorAttestation` | `false` |
| `requireVerifiedContact` | `true` |
| `sharedContactMode` | `REQUIRE_REVIEW` |
| `requireSeparateAudienceAndContentApproval` | `true` |
| `approvalExpiresHours` | `72` |
| `exportEnabled` | `true` |
| `handoffEnabled` | `true` |
| Accepted evidence (all channel/purpose pairs) | `EXPLICIT_OPT_IN` only |

## Identity and audience sources

Explicit `sources` required for audience materialization:

| Source | Rule |
|--------|------|
| `STAFFING_ASSIGNMENTS` | Requires linked Mission or staffing plan; **relevance only** — typically `MISSING_CONTACT` / `INELIGIBLE` without consent |
| `CAMPAIGN_USERS` | Active users; EMAIL contact points upserted as **UNVERIFIED** — still need evidence |
| `MANUAL` | Operator-entered candidates |
| `CONSENT_CONTACTS` | Existing contact points with stored evidence |

Blocked: `MOBILIZE_AGGREGATE` and any aggregate-only Mobilize path.

External person targets follow D18 match rules: `CONFIRMED` only for positive external linkage; `DO_NOT_LINK` / `AMBIGUOUS` / unreviewed blocked.

## Models / migration

`20260720200000_v21_campaign_communications_queue`

| Model | Role |
|-------|------|
| `CampaignCommunicationPolicy` | Versioned campaign comms policy snapshot |
| `CampaignContactPoint` | Normalized channel destination + verification |
| `CampaignCommunicationConsentEvidence` | Documented consent per contact / channel / purpose |
| `CampaignCommunicationSuppression` | Opt-out and policy suppressions |
| `CampaignCommunication` | Draft message + lifecycle + fingerprints |
| `CampaignCommunicationAudienceMember` | Per-recipient eligibility and inclusion |
| `CampaignCommunicationApproval` | Separate CONTENT / AUDIENCE / DISPATCH approvals |
| `CampaignCommunicationQueueItem` | Prepared export/handoff/dispatch slot (idempotent) |
| `CampaignCommunicationDeliveryEvent` | Future provider/manual delivery audit — **empty at ship** |

### Communication status

`DRAFT` → `AUDIENCE_REVIEW` → `CONTENT_REVIEW` → `APPROVED` → `QUEUED` → `EXPORTED` | `HANDED_OFF` → (future) `PARTIALLY_DISPATCHED` | `DISPATCHED`  
Also: `CANCELLED`, `STALE`

### Queue status

`PREPARED` | `BLOCKED` → `EXPORTED` | `HANDED_OFF` → (future) `DISPATCH_ACCEPTED` | `DISPATCH_REJECTED` | `UNKNOWN_OUTCOME` | `CANCELLED`

### Invariants

- Policy unique per `(campaignScopeKey, version)`
- Contact point unique per `(campaignScopeKey, channel, normalizedDestination)`
- Queue item unique `idempotencyKey` from communication + audience member + content + audience fingerprints
- Lazy create: communications and policy only on intentional operator/service writes — never on read paths
- `assertCommunicationsIsolation()` — D20 mutations touch only D20 models

## D18 / D19 read boundaries

D20 **may read** staffing assignments as audience **candidates** and D18 external match status for eligibility. D20 does **not**:

- Import Mobilize people as audience without explicit consent evidence
- Treat Mobilize signup/attendance aggregates as recipients
- Mutate staffing assignments or D18 observations
- Enable D18 person-level apply

See `KCCC_V2_1_VOLUNTEER_STAFFING_DELIVERABLE_19.md`, `KCCC_V2_1_MOBILIZE_SIGNUP_ATTENDANCE_READ_DELIVERABLE_18.md`, and `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md`.

## Provider adapter (disabled)

`DisabledCommunicationProviderAdapter` (`disabled-d20`):

- `MANUAL_EXPORT` and `MANUAL_HANDOFF`: documented + application-enabled
- `EMAIL_SEND`, `SMS_SEND`, `IN_APP_DELIVER`, webhooks, suppression/bounce import: documented but **not** application-enabled
- `dispatch()` always returns `{ ok: false, code: "DISABLED" }`

Mobilize remains event publishing + attendance read — **not** a D20 send provider.

## Architecture

| Layer | Path |
|-------|------|
| Domain | `src/lib/missions/v21/communications/*` |
| Repository | `src/server/repositories/campaign-communications-repository.ts` |
| Service | `src/server/services/campaign-communications-service.ts` |
| Validation | `tests/unit/missions/v21-communications.test.ts` |
| Migration apply | `scripts/apply-campaign-communications-migration.mjs` |

Service entry points (leadership auth): policy view/seed, draft CRUD, audience materialize/review, dual approval, queue prepare, export preview, handoff, consent/suppression CRUD, blocked dispatch attempt.

## Validation

```bash
npm run missions:v21:communications:validate
```

Includes full D1–D20 mission unit suite.

## Migration report (expected)

Applied via `KCCC_ALLOW_SCHEMA_MIGRATION=1` + `scripts/apply-campaign-communications-migration.mjs` (or `npm run stack:migrate` when history is clean).

| Metric | Count |
|--------|------:|
| Existing CampaignMission | 37 |
| Existing Event | 38 |
| D18 observations / matches / correlations | 0 / 0 / 0 |
| D19 staffing plans / requirements / assignments / acks | 0 / 0 / 0 / 0 |
| Local Person | 0 |
| Communication policies | **0** |
| Contact points / consent evidence / suppressions | **0 / 0 / 0** |
| Communications / audience / approvals / queue / delivery events | **0 / 0 / 0 / 0 / 0** |
| Fabricated comms records | **0** |

## Isolation boundary

`assertCommunicationsIsolation()` confirms D20 does not mutate Event, Mission phases, Field Ops, Logistics, staffing, Mobilize writes, or auto-send. External dispatch disabled by default.

## Operator guide

See `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md`.

## Consent and suppression policy

See `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md`.

## Rollback

See `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20_ROLLBACK.md`.

## Recommended D21

**Communications Provider Dispatch Foundation** — credential-tested email/SMS adapter, gated `externalDispatchEnabled`, provider delivery events, bounce/suppression import, and dispatch approval — still without inferring consent or auto-sending without operator queue action.
