# Phase Two — Intelligent Statewide Campaign Calendar (IC-01…IC-12)

```text
Program ID:   KCCC-PHASE-TWO-INTELLIGENT-STATEWIDE-CAMPAIGN-CALENDAR-1.0
Status:       IC_PHASE_AUTHORIZED — IC-01…IC-02C COMPLETE · IC-03…IC-12 NOT_AUTHORIZED
Locked:       2026-07-22 (vision) · IC phase opened 2026-07-23 (ADR-101/103/102)
Authority:    Kelly · ADR-093 · ADR-101 · ADR-103 · ADR-102 · ADR-104 · ADR-105 · ADR-106 · ADR-107
Prerequisite: Calendar Completion CC-01…CC-12 technically complete + post-CC-12 gates
Posture:      Calendar-centered · IC-01…IC-02C shipped · IC-03 design handoff only
```

## Product vision

> An intelligent statewide campaign operating calendar that understands why every Mission matters, detects geographic and strategic gaps, coordinates volunteers and travel, and invites immediate mobile action.

Keep the product **calendar-centered**. Do not turn operational pages into campaign advertisements. Branding and intelligence must increase confidence without reducing information density.

## Sequencing rule (binding)

```text
Protected sequence:
  CC-07 → CC-08 → CC-09 → CC-10 → CC-11 → CC-12
  → usability / AI-quality gate
  → IC phase authorization
  → IC-01…IC-12

Finish CC-07 → CC-12 first (Calendar Completion remains primary)
Design IC architecture during those builds is allowed
Clean extension points during CC-07…CC-12 are allowed
  (query contracts, design tokens, mobile-safe layouts,
   provider-neutral interfaces, geographic identifiers)
Forbidden during CC-07…CC-12:
  hidden Phase Two features · widened data collection
Implement IC-01…IC-12 only after CC-12 + gate + separate IC auth
Do not destabilize the calendar by premature Phase Two coding
Next engineering requires separate CC-07 authorization
```

## Long-range sequence

1. Finish **CC-07…CC-12**
2. **IC-01** Arkansas Campaign Geography Foundation
3. **IC-02** RedDirt Read Integration
4. **IC-02A** Event Outcome and Hot Wash (authorized calendar improvement; does not renumber IC-03)
5. **IC-02B** Mission Activation Playbooks and Department Operations
6. **IC-02C** Campaign Operating Structure Scaffold
7. **IC-03** Mission Intelligence Profile
8. **IC-04** Statewide Coverage Intelligence
9. **IC-05** Travel Pattern and Corridor Intelligence
10. **IC-06** Statewide Opportunity and Gap Engine
11. **IC-07** Kelly Calendar AI Copilot
12. **IC-08** Volunteer Identity, Consent, and Skills Foundation
13. **IC-09** Volunteer Manager Workspace
14. **IC-10** Mobilize Activation and Low-Touch Automation
15. **IC-11** Mobile Action Center and Push Notifications
16. **IC-12** Brand, Delight, and Product Identity
17. Dedicated **operator-usability + AI-quality gate** before broader automation

## Governing AI principle

> AI should understand and explain the campaign, but **deterministic services** must establish facts, authorization, consent, coverage, conflicts, and permissible actions.

| Authority level | Meaning |
|-----------------|--------|
| **Explain** | Read-only; may answer immediately |
| **Recommend** | Reviewable suggestions only |
| **Draft** | Explicitly requested drafts only |
| **Apply** | Always requires human confirmation |
| **External action** | Always requires fresh confirmation |

OpenAI API keys remain **server-only**. Models use **controlled application tools** (Responses API / function calling / structured outputs) — never unrestricted DB access. AI must never invent travel routes or silently decide which Arkansans matter.

---

## IC-01 — Arkansas Campaign Geography Foundation

**Status: COMPLETE (ADR-102)** — 75 counties · top 250 Census places · regions/corridors/priorities/focus overlays · Event/Mission geography reconciliation without schedule mutation. Docs: `KCCC_IC_01_ARKANSAS_CAMPAIGN_GEOGRAPHY_FOUNDATION.md`.

Authoritative statewide planning graph:

- All 75 counties · top 250 cities/communities · regions · travel corridors · county seats
- Priority counties · focus areas · campaign geographic tiers
- Provenance / source tagging (campaign-entered · public data · historical activity · operator judgment)
- Event / Mission geographic relationship extension points (no people-platform build-out in IC-01)
- RedDirt external identities deferred to **IC-02** (not in IC-01)

Every geographic priority must identify its **source**: campaign-entered · RedDirt (later) · public data · historical activity · operator judgment · AI suggestion (suggestion only; never silent policy).

**Hard rule:** County/city prioritization remains campaign policy — AI does not silently decide who matters.

## IC-02 — RedDirt Read Integration

**Status: COMPLETE** (ADR-104) — `KCCC_IC_02_REDDIRT_READ_INTEGRATION.md`.

Server-only, **read-first** RedDirt adapter. Ships safely as `NOT_CONFIGURED` when credentials or official API docs are absent; fixture + approved-export dry-run paths remain available. IC-01 owns FIPS/GEOID identity.

Build: external identity mapping · dry-run imports · provenance · privacy allowlist · IC-01 reconciliation · explicit apply of strategic geography facts · audit.

**Hard rule:** No blind sync; no RedDirt writes; no OpenAI; no people import; no Event/Mission mutation; no AI direct database access.

## IC-02A — Event Outcome and Hot Wash

**Status: COMPLETE** (ADR-105) — `KCCC_IC_02A_EVENT_OUTCOME_HOT_WASH.md`.

Post-Event review after scheduled end: attendance + operational outcomes, hot wash, encounters, follow-up linkage. Time passing → `REVIEW_DUE` only — never auto-complete / auto not-attended. Does not renumber IC-03.

**Hard rule:** Schedule ≠ attendance ≠ operational completion ≠ Mission execution ≠ review completion (ADR-105).

## IC-02B — Mission Activation Playbooks and Department Operations

**Status: COMPLETE** (ADR-106) — `KCCC_IC_02B_MISSION_ACTIVATION_PLAYBOOKS.md`.

Optional Activation Playbooks generate dated department work plans. Internal tasks only — no silent send/publish/purchase/assign. Department boards at `/system/operations/*`.

**Hard rule:** Activation plan independent of Mission lifecycle; internal generation ≠ external action.

## IC-02C — Campaign Operating Structure Scaffold

**Status: COMPLETE** (ADR-107) — `KCCC_IC_02C_CAMPAIGN_OPERATING_STRUCTURE.md`.

Four management lanes + vacant positions, six draft clusters, 75 County Captains. No fabricated people. IC-02B routes work to positions when installed.

## IC-03 — Mission Intelligence Profile

**Status: NOT_AUTHORIZED** — design handoff only: `KCCC_IC_03_DESIGN_HANDOFF.md`.

Structured, reviewable strategic profile per Mission. AI may **propose** purpose, value, coverage, audience, focus-area/travel/volunteer/prep needs, related Missions, confidence, missing info, citations.

Must distinguish: stored facts · deterministic calculations · AI inference · campaign-approved judgment.
Must distinguish **planned intent**, **IC-02B activation readiness**, **IC-02C org gaps**, and **IC-02A reviewed outcomes**.

**Hard rule:** AI suggestions never silently change the Mission.

## IC-04 — Statewide Coverage Intelligence

Leadership surface for 75-county / top-250-city coverage through Election Day: visited · scheduled · CONFIRMED vs HOLD · cancelled · days since presence · regional balance · priority/focus progress · coverage **quality** (not mere Event count) · duplicate visits vs expansion.

Define **meaningful coverage** with campaign-approved rules — an Event existing is not enough.

Overlays / saved views (when CC-07 exists): uncovered priority counties · no future visit · rural gap · regional imbalance · visit without follow-up · high-priority city without Mission · cancelled visit needing replacement.

## IC-05 — Travel Pattern and Corridor Intelligence

From **stored** Travel and calendar facts: trip clusters · corridors · backtracking · gaps · nearby-stop opportunities · overnight opportunities · buffer pressure · underused travel days · home-base implications · regional swings.

Initially: stored locations, times, travel minutes, campaign-defined regional adjacency.

**Hard rule:** Do not invent travel duration. Later maps providers may add routing; AI must never pretend it calculated a route when it did not.

## IC-06 — Statewide Opportunity and Gap Engine

**Deterministic** opportunity candidates first; AI explains/ranks — does not fabricate.

Examples: priority county with no future visit · top city without coverage · corridor with open window · cancelled Event gap · trip with room for another stop · focus area without Mission · volunteer concentration without activation · Mobilize interest without coverage · visit without follow-up.

Every suggestion needs: why · facts · confidence · calendar window · geography · travel assumptions · volunteer opportunity · risks · missing info · explicit **Create draft** action.

**Hard rule:** Suggestions never become Events/Missions automatically.

## IC-07 — Kelly Calendar AI Copilot

Embedded conversational assistant over authorized tools (calendar window, Mission profile, coverage, RedDirt/Mobilize aggregates, volunteers, availability, conflicts, travel preview, Event/Mission drafts, volunteer request prep, operator notes).

Authority levels: Explain / Recommend / Draft / Apply / External action (above).

Model routing: fast/cheap · balanced · frontier · embeddings — evaluate on real calendar tasks before fixing choices.

**Hard rule:** Server-only keys; tool allowlists; no unrestricted DB access.

## IC-08 — Volunteer Identity, Consent, and Skills Foundation

Safe import of volunteer/contact lists. Separate identity, contact points, verification, consent, suppression, geography, skills, interests, availability, mobility, roles, participation, Mobilize/RedDirt identities, local relationships.

**Hard rule:** Never infer consent from spreadsheet/signup/RSVP/attendance/prior contact.

Import workflow: preview → normalize → duplicates → match → review ambiguity → explicit apply → preserve source/consent evidence → suppression → audit.

## IC-09 — Volunteer Manager Workspace

Day-of answers: where needed · understaffed Missions · nearby available volunteers · skills/interests · confirmations/cancellations · uncontacted · permitted channels · follow-ups · counties with strength but no opportunity · Missions that could become activation Events.

Build staffing requirements, explained recommendations, explicit assignment, Mobilize RSVP context, confirmation tracking, replacement workflow, day-of check-in, history, workload protection.

**Hard rule:** AI may rank candidates; must not assign or contact automatically.

## IC-10 — Mobilize Activation and Low-Touch Automation

Finish Mobilize key configuration; verify live org. Controlled stages: read Events → timeslots → signups → attendance → identity match → publish approved → update approved → reconcile cancellations → RSVPs into volunteer review → attendance vs local check-in.

Automation may prepare previews and surface consequences; **human approval** required for public Event changes, assignments, contact, identity conflict resolution, consent/suppression overrides.

## IC-11 — Mobile Action Center and Push Notifications

Installable PWA: home-screen install · fast auth launch · offline today cache · push permission · deep links · large targets · resilient drafts · voice-to-note where appropriate.

Actionable notifications open action cards (confirm/decline/ack/assign/replace/note/timing/follow-up) after authorized fetch.

**Hard rules:** No sensitive lock-screen details (opaque IDs only). No notification silently mutates the calendar.

## IC-12 — Brand, Delight, and Product Identity

Connect unmistakably to the Kelly Grappe campaign while remaining a professional ops product.

Message pillars (from campaign site): “People over politics. Always.” · serve all 75 counties · protect public trust · lead with transparency · Regnat Populus · rural/urban inclusion · clarity over complexity.

Bring: authorized logo/wordmark · audited color tokens · licensed typography · restrained photography · 75-county visual language · branded splash/icon · campaign voice in empty/success states.

Personality: warm · clear · confident · Arkansas-rooted · practical · trustworthy · human · calm under pressure.

**Hard rule:** Inventory ownership/licensing before copying website assets. Shared design-token system — do not scrape CSS into the app.

---

## Required foundation beneath Phase Two

### AI knowledge layer

Governed knowledge base: Mission/calendar doctrine · county/city profiles · priority rationale · focus areas · travel policy · volunteer roles · message pillars · Mobilize rules · RedDirt field definitions · ADRs. Every AI answer identifies evidence.

### AI evaluation program

Eval sets before trusting recommendations: county-gap · Mission understanding · travel patterns · volunteer match · hallucination · citation · privacy leakage · unauthorized-action attempts · cost · latency · operator usefulness. Re-run on model/prompt/tool/scoring changes.

### AI cost and safety controls

Server-only key · per-feature budgets · model routing · caching · background jobs · rate limits · quotas · audit traces · prompt/version history · structured outputs · tool allowlists · confirmation boundaries · privacy filtering · no training/fine-tuning on campaign data without explicit decision · no inference of sensitive political beliefs/protected traits · no targeted persuasion from sensitive attributes.

---

## Out of scope until separately authorized

- Implementing any IC-01…IC-12 code before CC-12 completes
- Letting AI auto-mutate Events, Missions, assignments, contacts, or external systems
- Blind RedDirt or Mobilize write-back
- Marking Usability Synthesis complete because this vision is locked

## Relationship to Calendar Completion

| Track | Status |
|-------|--------|
| CC-01…CC-06 | COMPLETE |
| CC-07…CC-12 | Remain the **primary engineering sequence** |
| IC-01…IC-12 | Vision locked (ADR-093); design allowed during CC-07…CC-12; implement after CC-12 |
| Usability Synthesis 1 | Remains EMPTY until honestly completed |
