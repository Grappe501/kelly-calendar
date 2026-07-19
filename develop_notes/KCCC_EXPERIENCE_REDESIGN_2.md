# KCCC Experience Redesign 2.0

**Script ID:** `KCCC-EXPERIENCE-REDESIGN-2`  
**Track:** Engineering Track A · Version 2 program  
**Status:** PROPOSED · **VISION CAPTURED**  
**Vision annex:** `KCCC_EXPERIENCE_REDESIGN_2_VISION.md`  
**Implementation:** **BLOCKED** until Engineering Audit (EA-5…12) + Program Readiness Review + Hardening complete  
**Architecture:** 1.0  
**Feature Freeze:** ACTIVE — vision may deepen; **code must not**  
**Product Health:** PASS WITH FINDINGS (`KCCC_V1_PRODUCT_HEALTH_REPORT.md`)  

## Product philosophy (charter lead)

> **The Calendar Experience is not a calendar application. It is the operational heartbeat of the campaign. Every view should immediately orient the operator, communicate what matters now, explain why it matters, and guide the next decision—while faithfully presenting authoritative information without inventing certainty or assuming ownership of operational truth.**

## Experience philosophy (Redesign 2.0)

> **Every screen should reduce uncertainty, reinforce campaign momentum, and help the operator make the next best decision without overwhelming them.**

## Experience shift (target feel)

```text
Not:  Database → Calendar → Cards
But:  Mission → Campaign → Decisions → Calendar
```

Morning open should feel: **“The campaign is already awake.”** — not “here’s my calendar.”

Full concept set (Executive Dashboard, Campaign Pulse, brand, war-room language, rich cards, motion, contextual AI): see **`KCCC_EXPERIENCE_REDESIGN_2_VISION.md`**.

This aligns Architecture 1.0, the Trust Model, Engineering Patterns, Never Fake, and Experience Redesign into one vision.

```text
V1 ENGINEERING COMPLETE
        ↓
Engineering Audit (+ Product Health synthesis)
        ↓
Hardening
        ↓
Experience Redesign Program   ← this program
        ↓
Calendar Foundation
        ↓
Version 2 Feature Expansion (requires V2 Authorization)
```

## Working objective

> Transform the calendar from functional administrative software into a polished **campaign command center** that feels active, strategic, branded, and emotionally engaging — without inventing certainty.

## Guiding principle

> **Every screen should tell the story of the campaign before it shows the mechanics of the campaign.**

**Never Fake** remains binding during redesign (`KCCC_NEVER_FAKE_DOCTRINE.md`).  
**AI** (when authorized) is **contextual, not conversational** — labeled suggestions/analyses, never silent authority.

## First deliverable (when implementation opens)

```text
XR-01
Executive Hero Layer
```

Persistent **What Matters Now?** — critical / changed / at risk / next — before all other chrome.  
Seeds the Level-1 “campaign already awake” dashboard without requiring full AI or pulse integrations on day one.

**Comprehension-first sequence:** Hero → Legend → Hierarchy → Remove Unknown Wall → Mission Emphasis → Campaign Identity → (later) Ambient Intelligence.

Addresses: visual identity · layout hierarchy · motion · information density · interaction feedback · mobile behavior · narrative flow · executive confidence · campaign energy.

## Why first-class

This is **not** a cosmetic afterthought and **not** buried inside EA-4.  
EA-4 **diagnoses**. This program **redesigns** (after Hardening).  
EA-9 proves mission-entry continuity (HL-039) must exist before war-room cards can complete work.

## Build tracks

| ID | Track | Intent |
|----|-------|--------|
| XR-1 | Visual Design System | Typography, spacing, color roles (campaign navy/red/gold), elevation, icons, status, viz, motion principles, breakpoints, a11y tokens |
| XR-2 | Campaign Command Identity | Ops-center feel: countdown heartbeat, pulse, current mission, alerts, geography, readiness, “what matters now” |
| XR-3 | Dynamic View Personalities | Day (urgent/ops) · Week (tactical/mission) · Month (strategic/expansive) — same family, distinct personalities |
| XR-4 | Motion and Microinteractions | View transitions, hover, readiness, filters, skeletons, pulse, countdown — clarify state; honor reduced-motion |
| XR-5 | Hero Information Layer | Lead every view with a strong answer to its executive question |
| XR-6 | Rich Calendar Surfaces | War-room event blocks, density, priority, overlaps, travel arcs, deadlines, current-time, previews |
| XR-7 | Executive Storytelling | Where Kelly is going, pressure, regions, decisions, failure modes, success — campaign story, not generic calendar |
| XR-8 | Ambient / Contextual Intelligence | Quiet chief-of-staff cues — labeled AI observations & recommended actions; **not** a chatbot; Never Fake + evidence links |

## Proposed Version 2 sequence

```text
V2.0 Experience Redesign
  2.0.1 Visual audit findings (from EA-4) ..... COMPLETE
  2.0.2 Design direction and mood system ..... VISION CAPTURED
  2.0.3 Design tokens (campaign brand kit)
  2.0.4 Shared component language
  2.0.5 Day redesign
  2.0.6 Week redesign
  2.0.7 Month redesign
  2.0.8 Motion and interaction pass
  2.0.9 Responsive and accessibility pass
  2.0.10 Contextual intelligence pass (labeled; evidence-linked)
  2.0.11 Experience acceptance review

V2.1 Calendar Foundation

V2.2 Agenda View
V2.3 Timeline View
V2.4 Mission View
```

## Design direction (intent, not implementation)

The product should feel less like a calendar application and more like the **live heartbeat of the campaign** — energetic without becoming noisy; branded without costume patriotism.

## Hard rules

1. No redesign implementation until Audit + Hardening exit (and Readiness Review).  
2. Presentation remains non-owning (Architecture 1.0).  
3. Unknown stays honest; motion/pulse/AI must not invent readiness or attendance.  
4. Do not amend Architecture 1.0 corpus.  
5. Do not create `KCCC_VERSION_2_AUTHORIZATION.md` until formally issued.  
6. Unsourced opponent claims remain forbidden.  

## Architecture 1.0 Conformance Statement

Relies on Constitution §§3–6 (ownership / Unknown) and Calendar V1 ENGINEERING COMPLETE.  
**Affirms:** No amendments to Architecture 1.0 baseline (`6690ce2`). Redesign is experience only.
