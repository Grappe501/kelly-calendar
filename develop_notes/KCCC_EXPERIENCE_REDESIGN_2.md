# KCCC Experience Redesign 2.0

**Script ID:** `KCCC-EXPERIENCE-REDESIGN-2`  
**Track:** Engineering Track A · Version 2 program  
**Status:** PROPOSED  
**Implementation:** **BLOCKED** until Engineering Audit + Hardening complete  
**Architecture:** 1.0  
**Product Health:** PASS WITH FINDINGS (`KCCC_V1_PRODUCT_HEALTH_REPORT.md`)  

## Product philosophy (charter lead)

> **The Calendar Experience is not a calendar application. It is the operational heartbeat of the campaign. Every view should immediately orient the operator, communicate what matters now, explain why it matters, and guide the next decision—while faithfully presenting authoritative information without inventing certainty or assuming ownership of operational truth.**

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
Version 2 Feature Expansion
```

## Working objective

> Transform the calendar from a functional administrative screen into a polished campaign command experience that feels active, strategic, modern, and emotionally engaging.

## Guiding principle

> **Every screen should tell the story of the campaign before it shows the mechanics of the campaign.**

**Never Fake** remains binding during redesign (`KCCC_NEVER_FAKE_DOCTRINE.md`).

## First deliverable (when implementation opens)

```text
XR-01
Executive Hero Layer
```

Persistent **What Matters Now?** — critical / changed / at risk / next — before all other chrome.

**Comprehension-first sequence:** Hero → Legend → Hierarchy → Remove Unknown Wall → Mission Emphasis → Campaign Identity.

Addresses: visual identity · layout hierarchy · motion · information density · interaction feedback · mobile behavior · narrative flow · executive confidence · campaign energy.

## Why first-class

This is **not** a cosmetic afterthought and **not** buried inside EA-4.  
EA-4 **diagnoses**. This program **redesigns** (after Hardening).

## Build tracks

| ID | Track | Intent |
|----|-------|--------|
| XR-1 | Visual Design System | Typography, spacing, color roles, elevation, icons, status, viz, motion principles, breakpoints, a11y tokens |
| XR-2 | Campaign Command Identity | Ops-center feel: countdown, current mission, alerts, geography, readiness, “what matters now” |
| XR-3 | Dynamic View Personalities | Day (urgent/ops) · Week (tactical/mission) · Month (strategic/expansive) — same family, distinct personalities |
| XR-4 | Motion and Microinteractions | View transitions, hover, readiness, filters, skeletons, alerts — clarify state, don’t decorate |
| XR-5 | Hero Information Layer | Lead every view with a strong answer to its executive question |
| XR-6 | Rich Calendar Surfaces | Event blocks, density, priority, overlaps, travel arcs, deadlines, current-time, previews, side panels |
| XR-7 | Executive Storytelling | Where Kelly is going, pressure, regions, decisions, failure modes, success — campaign story, not generic calendar |

## Proposed Version 2 sequence

```text
V2.0 Experience Redesign
  2.0.1 Visual audit findings (from EA-4) ..... COMPLETE
  2.0.2 Design direction and mood system
  2.0.3 Design tokens
  2.0.4 Shared component language
  2.0.5 Day redesign
  2.0.6 Week redesign
  2.0.7 Month redesign
  2.0.8 Motion and interaction pass
  2.0.9 Responsive and accessibility pass
  2.0.10 Experience acceptance review

V2.1 Calendar Foundation

V2.2 Agenda View
V2.3 Timeline View
V2.4 Mission View
```

## Design direction (intent, not implementation)

The product should feel less like a calendar application and more like the **live heartbeat of the campaign** — energetic without becoming noisy.

## Hard rules

1. No redesign implementation until Audit + Hardening exit.  
2. Presentation remains non-owning (Architecture 1.0).  
3. Unknown stays honest; motion must not invent readiness.  
4. Do not amend Architecture 1.0 corpus.  

## Architecture 1.0 Conformance Statement

Relies on Constitution §§3–6 (ownership / Unknown) and Calendar V1 ENGINEERING COMPLETE.  
**Affirms:** No amendments to Architecture 1.0 baseline (`6690ce2`). Redesign is experience only.
