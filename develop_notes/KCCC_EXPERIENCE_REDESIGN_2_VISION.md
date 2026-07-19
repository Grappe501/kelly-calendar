# Experience Redesign 2.0 — Vision Capture

**Script ID:** `KCCC-EXPERIENCE-REDESIGN-2-VISION`  
**Parent:** `KCCC_EXPERIENCE_REDESIGN_2.md`  
**Status:** CAPTURED (vision only)  
**Date:** 2026-07-19  
**Implementation:** **FORBIDDEN** while Feature Freeze ACTIVE · Redesign remains BLOCKED until Audit + Hardening + Program Readiness Review  
**Version 2 Authorization:** NOT ISSUED — this document does not authorize build  

```text
Nature .................... VISION / INTENT
Feature Freeze ............ HONORED
Architecture 1.0 .......... PRESERVED
Never Fake ................ BINDING
Behavior changes now ...... NONE
```

---

## Why capture now

Audits EA-1…EA-9 converge on the same readiness story: Architecture is sound; Hardening and Foundation fix continuity and honesty. That frees the program to **define the emotional and experiential target** of Redesign 2.0 without building it.

This is not a backlog dump. It is the north star Redesign must satisfy when implementation opens.

---

## The Experience Shift

| Today (felt) | Target (felt) |
|--------------|---------------|
| Database → Calendar → Cards | **Mission → Campaign → Decisions → Calendar** |

Same underlying data. Different emotional contract.

The product must stop reading as generic software and start reading as a **campaign command center**.

---

## Experience Goal

When Kelly opens the system at 7:00 AM, she should not think:

> “Here’s my calendar.”

She should think:

> **“The campaign is already awake.”**

---

## Experience Philosophy (binding for Redesign)

> **Every screen should reduce uncertainty, reinforce campaign momentum, and help the operator make the next best decision without overwhelming them.**

Aligned with:

- Architecture 1.0 ownership (Calendar remains presentation)
- Never Fake (no invented certainty for momentum theater)
- OCI (confidence from clarity)
- EA-2 primary decisions per view
- EA-8 authorization continuity through the projection pipeline
- EA-9 mission-entry continuity (HL-039) before “rich cards” can be trustworthy

---

## Level 1 — Executive Dashboard (concept)

First surface intent (not a V1 feature; Redesign/V2 when authorized):

```text
NOVEMBER 3 ELECTION
112 DAYS · 08 HOURS · 14 MINUTES

TODAY'S CAMPAIGN
18 Events · 3 Decisions · 5 Volunteers Waiting
2 Conflicts · 7 Counties Active
```

The election countdown is the **heartbeat**, not decoration.  
Every count must be **traceable** to an authoritative owner or labeled Unknown / partial / derived — never fabricated to fill the board.

Maps to: XR-01 Executive Hero · XR-2 Campaign Command Identity · XR-5 Hero Information Layer.

---

## Live Campaign Pulse (concept)

Ambient strip conveying aliveness — volunteers active, conversations, county check-ins, invitation funnel, goal progress, days to election.

Rules:

- Pulse metrics require owning domains or explicit Unknown
- Progress bars are presentation of owned numerators/denominators
- Motion updates must not invent “live” when data is stale (show freshness / Unknown)

Maps to: XR-2 · XR-4 Motion · XR-7 Executive Storytelling.

---

## Campaign Brand Identity

Carry identity from **kellygrappe.com** / campaign brand kit into the ops surface so Calendar feels like the same ecosystem as the public site:

| Intent | Guidance |
|--------|----------|
| Palette | Campaign navy · campaign red · campaign gold (emphasis) |
| Type | Campaign typography (not default SaaS stacks) |
| Imagery | Campaign photography as atmospheric / war-room context |
| Motifs | Subtle patriotic cues where appropriate — not costume |

Exact tokens are a Redesign design-system deliverable (XR-1) — **do not invent hex values in audit/vision passes**.

Maps to: XR-1 Visual Design System · XR-2 Campaign Command Identity.

---

## War-Room Calendar Language

Replace appointment-list energy with operations narrative:

| Generic | Command |
|---------|---------|
| Monday · 9 AM · Meeting | Campaign Operations · TODAY · Little Rock · Volunteer Training · HIGH IMPACT · 23 volunteers · Media Present |

Same schedule atoms. Story first; mechanics second.

Maps to: XR-3 Dynamic View Personalities · XR-6 Rich Calendar Surfaces · XR-7 Executive Storytelling.  
Depends on: HL-039 mission entry · permission-aware projections (HL-031).

---

## Rich Cards

Every card should communicate importance at a glance: priority, place, confirmed/waiting counts, whether AI notes exist — without burying the primary decision.

Depends on owned fields + safe projections; counts stay Unknown when evidence is absent.

---

## Motion

Purposeful, not flashy:

- Gentle card expansion
- Natural timeline / view transitions
- Countdown tick (when data authoritative)
- Subtle pulse updates
- Polished hover / focus (respect `prefers-reduced-motion` — EA-5)

Maps to: XR-4. Motion must never invent readiness (Never Fake).

---

## AI Everywhere — Quietly (contextual, not conversational)

Differentiate with **chief-of-staff presence**, not a corner chatbot.

| Mode | Role |
|------|------|
| **Authoritative data** | Visually distinct · traceable to source · Calendar never owns |
| **AI observations** | Explicitly labeled suggestion / analysis · non-authoritative |
| **Recommended actions** | Explain why · link to evidence when possible · never silent mutation |

### Example surfaces (vision)

| Surface | Intent |
|---------|--------|
| Morning Brief | Attention events · volunteer trend · county win · suggested call — all labeled |
| Travel Assistant | Leave-by from owned travel + advisory weather — weather stays Advisory / NOT_INTEGRATED until owned |
| Debate Prep | Prep cues tied to owned briefings / media signals — no unsourced opponent claims |
| Volunteer Momentum | Re-engagement opportunities from owned volunteer facts |
| County Health | Momentum summary as analysis over owned county metrics |
| Ambient Intelligence | Small day-level cues (best media day, weather favorable, volunteer availability) without chat |

### Binding AI rules

1. **Contextual over conversational** — surface insights where useful; do not require prompt craft.  
2. **Never Fake** — AI must not fill Unknown as fact.  
3. **No unsourced opponent claims** (program hard rule).  
4. **Authorization continuity** (EA-8) — insights inherit the operator’s projection rights.  
5. AI features are **Version 2+ / post-authorization** — not Hardening scope unless a Hardening item only adds labeling hygiene on existing derives.

Maps to proposed track **XR-8 Ambient / Contextual Intelligence** (vision).

---

## Mapping to audit program

| Audit theme | How Redesign uses it |
|-------------|----------------------|
| EA-1 Ownership | Storytelling never steals domain truth |
| EA-2 Decisions | Hero answers primary decision first |
| EA-3 / EA-6 Foundation | Shared assembly + permission-aware context before rich surfaces scale |
| EA-4 / EA-5 Visual + Inclusive | Brand, motion, density cues with a11y |
| EA-7 Honesty | Labels for derived / heuristic / AI |
| EA-8 Continuity | Insights respect access level |
| EA-9 Workflow | Mission entry (HL-039) before war-room cards feel real |

---

## What this document does **not** do

- Does not authorize Version 2 development  
- Does not reopen Version 1 Feature Freeze  
- Does not schedule AI/chatbot implementation  
- Does not invent metrics, brand hex codes, or opponent claims  
- Does not bypass Hardening or Program Readiness Review  

---

## Architecture 1.0 Conformance Statement

Vision only. Affirms baseline `6690ce2`. Redesign remains experience and presentation; ownership and Unknown doctrine unchanged. AI observations are never authoritative sources.
