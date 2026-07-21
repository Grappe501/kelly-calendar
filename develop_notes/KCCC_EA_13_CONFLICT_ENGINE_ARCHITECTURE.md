# KCCC EA-13 — Conflict Engine Architecture

```text
Build id:     KCCC-EA-13-CONFLICT-ENGINE-1.0
Document:     ARCHITECTURE ONLY — not authorized for implementation
Depends on:   Step 12 Availability & Scheduling Intelligence (authorized + materialized)
Blocked by:   Operator Observation Pass 1 + Synthesis 1 → Step 12 gate
Status:       DESIGN READY · IMPLEMENTATION HELD
```

## Purpose

Step 13 answers: **what happens when scheduling rules collide?**

Step 12 answers: **when people can or should be scheduled** (availability, buffers, rhythms, travel constraints, campaign priorities).

Without Step 12, a conflict engine either invents placeholder rules (later thrown away) or must be redesigned after availability lands. This document locks the Step 13 design so implementation can start immediately once Step 12 is authorized and in place.

---

## Hard dependencies (do not bypass)

```text
Operator Observation → Synthesis → Step 12 authorized & built
                                         ↓
                              Availability model is a conflict input
                                         ↓
                              Step 13 Conflict Engine implementation
```

| Input from Step 12 | Used by Step 13 for |
|--------------------|---------------------|
| Standing availability windows | Time / rhythm violations |
| Buffers (prep, travel, recovery) | Preparation-time & travel infeasibility |
| Recurring work blocks | Priority vs blocked-time conflicts |
| Travel / location constraints | Travel infeasibility, multi-stop splits |
| Campaign priority weights | Priority conflicts & resolution ranking |
| Vacation / override releases | False-positive suppression |

**Rule:** Conflict detectors must consume the Step 12 availability service — not hard-code parallel rules.

---

## Architecture position

```text
Operational Layer (operator defines reality)
  Canonical Event · Views · Editing · Availability (Step 12)
        ↓
Intelligence Layer (system interprets reality) — Step 13 is the first slice
  Conflict engine · Travel feasibility · later: readiness, AI, optimization
        ↓
Operating views + event editor     ← surface conflicts where operators act
```

**Governing rule:** The system may detect, explain, recommend, and simulate—but it never changes the operator's schedule without explicit approval.

Standing doc: `develop_notes/KCCC_OPERATIONAL_VS_INTELLIGENCE_LAYERS.md`

Preserved constitutional rules:

- Deterministic detection only (no invented distances without approved mapping).
- `automaticallyResolved` is always `false` — operator retains final control.
- Explain *why* before offering resolutions.
- Align with existing `OperationalConflict` shape (`conflict-types.ts`) and `OperationalConflictRecord`.

---

## Conflict types

| Type | Code (proposed) | Meaning | Primary evidence |
|------|-----------------|---------|------------------|
| Time overlap | `TIME_OVERLAP` | Two events overlap for the same actor or calendar scope | Event start/end intervals |
| Travel infeasibility | `TRAVEL_INFEASIBLE` | Cannot reach next location in remaining time | Travel segments + duration estimates + buffers |
| Double-booked participants | `PARTICIPANT_DOUBLE_BOOK` | Same person required in two places at once | `EventPerson` / staffing assignments |
| Venue conflict | `VENUE_CONFLICT` | Same venue booked twice (or capacity exceeded when modeled) | Location identity + intervals |
| Campaign priority conflict | `PRIORITY_COLLISION` | Lower-priority event occupies time needed for higher-priority work | Step 12 priority weights + Event mission/priority fields |
| Preparation time violation | `PREP_BUFFER_VIOLATION` | Prep window compressed below standing buffer | Step 12 prep buffers + prep tasks |
| Follow-up collision | `FOLLOWUP_COLLISION` | Required follow-up overlaps critical schedule or another follow-up | Follow-up deadlines + Event graph |
| Resource conflict | `RESOURCE_CONFLICT` | Staff, vehicle, or equipment assigned beyond capacity | Staff/resource assignments |

Additional detectors may appear later (e.g. county coverage gaps) but are out of EA-13 core.

---

## Conflict severity

Operator-facing tiers (product language):

| Operator label | Engine severity | Behavior |
|----------------|-----------------|----------|
| Informational | `INFO` | Visible; does not block save/publish |
| Warning | `WARNING` | Must be acknowledged or consciously overridden to proceed |
| Blocking | `HIGH` / `CRITICAL` | Blocks publish / hard schedule commit until resolved or escalated |

Mapping keeps compatibility with existing `ConflictSeverity` (`INFO` \| `WARNING` \| `HIGH` \| `CRITICAL`).

Severity assignment rules (design intent):

- Soft buffer squeeze → Warning; hard impossibility (travel `IMPOSSIBLE`, double-book candidate) → Blocking.
- Priority collision severity follows Step 12 priority delta (small delta → Warning; hard campaign-critical → Blocking).
- Informational reserved for advisory patterns (e.g. tight but feasible travel).

---

## Detection lifecycle

```text
On create / update / reschedule / publish / duplicate:
  1. Load Event graph for affected range + actors
  2. Evaluate Step 12 availability (windows, buffers, priorities, overrides)
  3. Run type detectors (deterministic)
  4. Persist OperationalConflictRecord(s) with explanation + evidence
  5. Attach suggestedResolutions (autonomous: false)
  6. Return conflicts to caller; never silent-resolve
```

Recompute on relevant graph changes (participants, travel, venue, prep, follow-up). Stale conflicts marked superseded, not deleted without audit.

---

## Resolution strategies

Suggestions only — operator chooses. Each suggestion is a one-click *proposal* that still goes through authorized Event mutation paths.

| Strategy | Code (proposed) | Typical types | Notes |
|----------|-----------------|---------------|-------|
| Suggest alternate times | `SUGGEST_ALTERNATE_TIMES` | Overlap, priority, prep | Uses Step 12 free windows |
| Recommend delegation | `RECOMMEND_DELEGATION` | Participant / resource | Does not auto-reassign |
| Adjust buffers | `ADJUST_BUFFERS` | Prep, travel tight | May require Step 12 rule edit or one-off exception |
| Reschedule preparation | `RESCHEDULE_PREP` | Prep violations | Moves prep, not the public event, when possible |
| Split multi-stop trips | `SPLIT_MULTI_STOP` | Travel infeasibility | Rewrites travel segments; Event times may stay |
| Escalate to operator | `ESCALATE` | Blocking / ambiguous | Surfaces to command / conflict inbox |

Existing acknowledge / override APIs remain the control plane for conscious acceptance of residual risk.

---

## Operator experience

| Requirement | Design |
|-------------|--------|
| Detect automatically | Engine runs on mutation + range refresh (Today / Day / editor) |
| Explain *why* | Human-readable `explanation` + structured `evidence[]` (never opaque codes alone) |
| One-click resolutions | Suggested actions open confirmable flows (reschedule, delegate, adjust) |
| Preserve control | No auto-apply; overrides audited; Blocking requires explicit path |

Surfaces (implementation targets after authorization):

1. Event editor — inline conflict panel before save/publish  
2. Today / Day / Week — conflict badges on affected events  
3. Ops lens `/calendar/ops/conflicts` — queue for review  
4. System conflicts workspace — escalation / audit (extend existing `/system/conflicts`)

---

## Service / module sketch (implementation later)

```text
availability-service          (Step 12 — input)
conflict-detection-service    (type detectors)
conflict-explanation-service  (why + evidence)
conflict-resolution-service   (suggest only)
conflict-query-service        (existing — list/filter)
conflict-repository           (existing OperationalConflict*)
```

Reuse: `src/features/operational-intelligence/services/conflict-service.ts`, types, APIs under `/api/conflicts` and `/api/events/[eventId]/conflicts`. Extend; do not fork a second conflict model.

Out of scope for Step 13: Mobilize publishing conflicts and Communications recipient conflicts (separate domains; do not merge into calendar conflict engine).

---

## Relationship to observation evidence

Pass 1 may reveal:

- Which conflict signals feel like noise vs trust  
- Whether operators want conflicts at create-time, publish-time, or only in a queue  
- Language that makes “why” understandable  

Feed those findings into severity defaults and UX placement **before** coding detectors — without changing this dependency order.

---

## Acceptance criteria (when implementation is authorized)

```text
[ ] Step 12 availability service is the sole rule source for availability-derived conflicts
[ ] All eight core conflict types detect deterministically with tests
[ ] Severities map to Informational / Warning / Blocking operator behavior
[ ] Every conflict has explanation + evidence; automaticallyResolved === false
[ ] Suggested resolutions are one-click proposals, not silent mutations
[ ] Conflicts appear in editor + at least one operating view + conflicts ops lens
[ ] Acknowledge / override remain audited
[ ] No parallel Event or conflict schema that bypasses canonical Event
```

---

## Explicit non-goals (this design)

- Implementing detectors before Step 12 authorization  
- Auto-resolving conflicts  
- Inventing travel times without approved providers  
- Absorbing Mobilize / Communications conflict domains into this engine  

---

## Gate summary

```text
Now:        Complete observation + synthesis; design Step 13 (this doc) — DONE for architecture
Next build: Step 12 (after evidence review) — Availability & Scheduling Intelligence
Then build: Step 13 — Conflict Engine implementation against this architecture
```
