# Phase Two — Intelligent Statewide Campaign Calendar (IC-01…IC-12)

```text
Program ID:   KCCC-PHASE-TWO-INTELLIGENT-STATEWIDE-CAMPAIGN-CALENDAR-1.0
Status:       VISION LOCKED — NOT AUTHORIZED FOR IMPLEMENTATION
Locked:       2026-07-22
Authority:    Kelly · ADR-093 · KCCC_PHASE_TWO_VISION_LOCK_KELLY_2026-07-22.md
Prerequisite: Calendar Completion CC-07…CC-12 finished
Posture:      Calendar-centered · design during CC builds · implement after CC-12
```

## Product vision

> An intelligent statewide campaign operating calendar that understands why every Mission matters, detects geographic and strategic gaps, coordinates volunteers and travel, and invites immediate mobile action.

Keep the product **calendar-centered**. Do not turn operational pages into campaign advertisements. Branding and intelligence must increase confidence without reducing information density.

## Sequencing rule (binding)

```text
Finish CC-07 → CC-12 first (Calendar Completion remains primary)
Design IC architecture during those builds is allowed
Implement IC-01…IC-12 only after CC-12 exits
Do not destabilize the calendar by premature Phase Two coding
```

## Long-range sequence

1. Finish **CC-07…CC-12**
2. **IC-01** Arkansas Campaign Geography Foundation
3. **IC-02** RedDirt Read Integration
4. **IC-03** Mission Intelligence Profile
5. **IC-04** Statewide Coverage Intelligence
6. **IC-05** Travel Pattern and Corridor Intelligence
7. **IC-06** Statewide Opportunity and Gap Engine
8. **IC-07** Kelly Calendar AI Copilot
9. **IC-08** Volunteer Identity, Consent, and Skills Foundation
10. **IC-09** Volunteer Manager Workspace
11. **IC-10** Mobilize Activation and Low-Touch Automation
12. **IC-11** Mobile Action Center and Push Notifications
13. **IC-12** Brand, Delight, and Product Identity
14. Dedicated **operator-usability + AI-quality gate** before broader automation

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

Authoritative statewide planning graph:

- All 75 counties · top 250 cities/communities · regions · travel corridors · county seats
- Priority counties · focus areas · campaign geographic tiers
- RedDirt external identities and provenance
- Event / Mission / volunteer / contact geographic relationships

Every geographic priority must identify its **source**: campaign-entered · RedDirt · public data · historical activity · operator judgment · AI suggestion.

**Hard rule:** County/city prioritization remains campaign policy — AI does not silently decide who matters.

## IC-02 — RedDirt Read Integration

Server-only, **read-first** RedDirt adapter.

Before implementation, Burt inspects: API docs, auth, objects/fields, counties/cities, contacts, volunteers, participation, tags/focus areas, timestamps, pagination, rate limits, export restrictions, consent/suppression, permitted uses.

Build: external identity mapping · dry-run imports · provenance · incremental checkpoints · conflict detection · data minimization · privacy/role restrictions · audit.

**Hard rule:** No blind sync; no AI direct database access.

## IC-03 — Mission Intelligence Profile

Structured, reviewable strategic profile per Mission. AI may **propose** purpose, value, coverage, audience, focus-area/travel/volunteer/prep needs, related Missions, confidence, missing info, citations.

Must distinguish: stored facts · deterministic calculations · AI inference · campaign-approved judgment.

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
