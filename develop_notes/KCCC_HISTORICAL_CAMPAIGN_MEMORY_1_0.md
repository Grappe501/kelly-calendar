# Historical Campaign Memory 1.0 — Vision & Planning Capture

**Script ID:** `KCCC-HISTORICAL-CAMPAIGN-MEMORY-1.0`  
**Short name:** Campaign Movement History  
**Status:** CAPTURED (planning / vision only)  
**Date:** 2026-07-19  
**Implementation:** **BLOCKED** while Feature Freeze ACTIVE · Audit / Hardening / Program Readiness Review incomplete  
**Version 2 Authorization:** NOT ISSUED — this document does not authorize build  

```text
Nature .................... VISION / GOVERNED INITIATIVE PLAN
Feature Freeze ............ HONORED
Architecture 1.0 .......... PRESERVED
Never Fake ................ BINDING
Behavior changes now ...... NONE
AI readiness .............. NO (until gates pass)
```

---

## Why capture now

Pass 3 live ingest already preserves trustworthy state distinctions:

```text
CONFIRMED · TENTATIVE · INFORMATIONAL/HOLD · STAGED_UNKNOWN
CANCELLED · SUPERSEDED · private/restricted · UNKNOWN fields
```

Those distinctions are the foundation of **campaign memory**, not just a calendar. The long-term asset is not a list of appointments — it is a **campaign movement history and geographic relationship graph** beginning **November 1, 2025**, enriched with CRM linkage and outcomes, so AI can later answer strategic questions with evidence and uncertainty.

This document records the initiative so it is not lost. It does **not** reopen V1, start Foundation implementation, or enable AI rewrite of event truth.

---

## North-star questions (future AI consumers)

When memory is sufficiently complete, AI may help operators ask:

| Question | Depends on |
|----------|------------|
| Where have Kelly and Steve spent the most time? | Event truth + attendance + geography |
| Which counties / cities / orgs / constituencies have received the least attention? | Geographic + relationship layers + coverage metrics |
| Which events produced contacts, volunteers, donors, invitations, follow-ups? | Outcome truth (Unknown until recorded) |
| Which relationships have gone quiet? | Relationship + follow-up ownership + time since last contact |
| Where does returning soon make strategic sense? | Coverage + outcomes + pending invitations |
| Which routes can combine valuable stops efficiently? | Geography + travel + pending opportunities |
| How balanced is activity across districts / counties / regions? | Geographic enrichment + status filters |
| Which event types produce the strongest measurable results? | Classification + outcome metrics with coverage disclosure |

---

## Five linked layers (future data model)

Each historical stop eventually carries several linked layers. Layers may be Incomplete / Unknown independently. **Do not invent missing layers.**

### 1. Event truth

What actually occurred (or was scheduled), with confidence:

```text
Event title
Start and end
City · County · Venue
Event type
Attendance status
Kelly attended · Steve attended · Campaign staff attended
Source · Confidence
Cancelled / completed / tentative / informational / staged
Stable external IDs (Google event id, iCal UID, recurrence id)
Created / modified timestamps when available
```

**Binding:** Personal, work, medical, travel, virtual, cancelled, and tentative records remain distinguishable. Not every Google event is a campaign stop.

### 2. Geographic truth

Governed enrichment — **not calendar guessing**:

```text
City · County
Congressional district
State House · State Senate
Region · ZIP when appropriate
Latitude / longitude
Rural / suburban / urban classification
```

Source: governed geographic enrichment process with reviewable provenance. Unknown stays Unknown.

### 3. Relationship truth

Connects calendar to campaign CRM — **does not become a second contact database**:

```text
Host · Organizer · Inviting contact
County chair · Local volunteer lead
Elected officials present · Candidates present
Community / faith / media organizations
Donors · Follow-up owner
```

Linkage is referential to CRM/contact systems when authorized.

### 4. Outcome truth

Post-event facts only when recorded:

```text
Meaningful conversations
New contacts · Volunteers · Donations
Invitations received · Follow-up tasks
Media earned · Photos / video
Merchandise distributed
Issues heard · Commitments made
```

**Never Fake:** Unknown values remain Unknown. Do not backfill fictional outcomes because an event occurred.

### 5. Campaign memory (derived narrative)

Structured memory for retrieval — always labeled as derived / AI observation when generated:

> Kelly last visited Union County on August 5 for an immersion day and retired ministers luncheon. The campaign met faith-community leaders but has no recorded follow-up completion. No return visit is currently scheduled.

Not:

> Kelly had two events in El Dorado.

---

## Historical ingest strategy (four controlled passes)

### Pass A — Calendar history import

```text
Range: 2025-11-01 America/Chicago → present
Preserve: stable event ID, recurrence ID, created, modified,
          cancellation status, organizer, attendees, location,
          notes, source calendar
Mode: fetch → normalize → dedupe → stage → operator review
```

Bootstrap / fallback: private secret iCal via `KCCC_GOOGLE_CALENDAR_ICAL_URL` (env only; never commit).  
**Production archive target:** Google Calendar API + OAuth (stable IDs, updates, cancellations, attendees, recurrence, modification timestamps).

Opaque Pass-3 template placeholders (`KCCC_PASS3_GCAL_URL_1` / `_2`) remain unresolved staged sources — they are **not** a substitute for the full history feed.

### Pass B — Classification and deduplication

Classify (examples):

```text
Campaign event · Travel · Personal · Work · Fundraising
Volunteer operations · Internal meeting · Media
Community engagement · Party organization · Faith outreach
Government · Unresolved
```

AI may **recommend** classifications for human review. AI must not silently rewrite event truth.  
Dedup uses source IDs and evidence — not title matching alone.

### Pass C — Geographic and relationship enrichment

Link to counties, districts, organizations, known contacts, regions, follow-up records. Begin the relationship map under CRM ownership rules.

### Pass D — Outcome reconstruction

Fast post-event debrief (≈ two minutes), not a long report:

```text
Who did we meet?
Who needs follow-up?
What did we promise?
What concerns did we hear?
Did anyone volunteer?
Was money raised?
Were photos taken?
Should we return?
```

---

## Future AI intelligence forms (advisory only)

| Form | Example observation style |
|------|---------------------------|
| Coverage | “Kelly has held 14 campaign activities in Pulaski County but only one confirmed stop in Lonoke County” (with filters stated) |
| Relationship | “Interacted with this organization three times; no follow-up task or owner recorded” |
| Return-visit | “Blytheville six weeks ago; multiple local leaders; no return scheduled; NE Arkansas trip could combine three pending invitations” |
| Route | “Russellville could combine with pending Conway / Clarksville opportunities” |
| Audience | “Faith-community events have generated more recorded follow-up contacts than general political meetings, based on currently recorded outcomes” |
| Scheduling | “Wednesday evenings show repeated travel pressure after Kelly’s workday” |
| Memory retrieval | “Every event involving retired ministers, NAACP branches, county Democratic committees, or El Dorado since November 2025” |

### Critical AI boundary

| Permitted | Forbidden |
|-----------|-----------|
| “Based on available records, Northeast Arkansas appears under-visited.” | “Northeast Arkansas has been neglected.” |
| Evidence-based observation + uncertainty | Political conclusion beyond the data |
| Labeled non-authoritative insight | Silent rewrite of canonical event truth |

Always separate:

```text
Recorded fact
Derived metric
AI observation
AI recommendation
Human decision
```

Aligned with: Never Fake · Architecture 1.0 ownership · XR-8 vision (contextual, not conversational command) · no unsourced opponent claims.

---

## Planning contract (must be defined before build)

The authorized initiative packet must specify:

1. **Historical boundary** — November 1, 2025 (`America/Chicago`)  
2. **Google Calendar import contract** — fields retained; personal vs campaign distinguishability  
3. **Secret iCal / OAuth handling** — env-only secrets; OAuth as production path; iCal as bootstrap/fallback  
4. **Deduplication rules** — UID / external id / evidence hierarchy  
5. **Campaign-stop classification** — taxonomy + review workflow  
6. **Completion vs cancellation truth** — status vocabulary mapping (reuse Pass 3 lessons)  
7. **Geographic enrichment** — governed sources; no guess-from-title  
8. **CRM / contact linkage** — referential, not a parallel CRM  
9. **Post-event outcome capture** — two-minute debrief UX (Redesign/V2 surfaces)  
10. **AI readiness gates** — data-quality score thresholds before AI observations  
11. **Human approval requirements** — classification, enrichment, outcome promotion  
12. **Historical data-quality score** — coverage, review %, Unknown rates, outcome completeness  
13. **Privacy and RBAC** — Busy-only / restricted / dial-in / lodging / residential address rules  

Related existing artifacts (do not reimplement under Freeze):

- `KCCC_GOOGLE_CALENDAR_HISTORICAL_IMPORT_PROTOCOL.md`  
- `KCCC_PRIVATE_ICAL_ENV_INTEGRATION.md`  
- `KCCC_IMPORT_NORMALIZATION_STANDARD.md` / `KCCC_IMPORT_DEDUPLICATION_STANDARD.md`  
- `KCCC_HISTORICAL_CATALOGUE_STANDARD.md` / `KCCC_HISTORICAL_CATALOGUE_DATABASE_MODEL.md`  
- `KCCC_HISTORICAL_PATTERN_STANDARD.md`  
- `KCCC_OPERATOR_PASS3_INGEST.md` (status vocabulary evidence)  
- `KCCC_EXPERIENCE_REDESIGN_2_VISION.md` (XR-8 contextual intelligence)  

---

## Gate sequence (binding)

```text
1. Finish Audit (EA-5…EA-12 as required by program)
2. Program Readiness Review
3. Hardening (ledger execution)
4. Experience Redesign 2.0 / Calendar Foundation as required by V2 plan
5. Version 2 Planning Review includes this initiative
6. Explicit authorization packet: KCCC-HISTORICAL-CAMPAIGN-MEMORY-1.0 IMPLEMENT
```

Until step 6: **no schema redesign for memory graph**, **no AI pattern recognition on live history**, **no silent promotion of staged imports to canonical campaign stops**.

Allowed now (already or under existing import freeze exceptions):

- Document this vision  
- Keep Pass 3 / operator ingest status honesty  
- Keep private iCal env bootstrap (import → stage → review only)  
- Continue Never Fake and Unknown preservation  

---

## What this document does **not** do

- Does not authorize Version 2 or Foundation implementation  
- Does not reopen Version 1 Feature Freeze  
- Does not enable AI recommendations or conversational AI  
- Does not invent geographic districts, outcomes, or attendance  
- Does not replace CRM with calendar-stored contacts  
- Does not treat secret iCal as the permanent production sync path  

---

## Architecture 1.0 Conformance Statement

Vision / planning only. Calendar remains presentation of owned event truth. Geographic, CRM, and outcome layers have separate owners when implemented. AI observations never become authoritative sources. Affirms Never Fake and the November 1, 2025 historical floor already established for Google import staging.
