# Architecture Decision Register

Machine-readable source: `data/architecture_decisions.json`

## Visibility (ADR-029–035)

Occupied time visible; calendar name; safe titles; location disclosure; server sanitization; layered visibility; primary calendar label.

## Historical import & fast entry (ADR-036–045)

- ADR-036 Historical Calendar Floor (2025-11-01)
- ADR-037 External Events Enter Through Staging
- ADR-038 Public iCal and API Provider Contracts
- ADR-039 External Identity Preservation
- ADR-040 No Blind Historical Claims
- ADR-041 Structured Entry Before Free Text
- ADR-042 Full Operational Plan Per Event
- ADR-043 AI Suggestions Evidence-Based
- ADR-044 Reviewed History Powers Recommendations
- ADR-045 Drafts Are Clearly Non-Live

## Database foundation (ADR-046–057)

- ADR-046 Dedicated PostgreSQL Schema (`kelly_calendar`)
- ADR-047 One Canonical Event
- ADR-048 Command Calendar Is a Roll-Up Surface
- ADR-049 Event Details Are Section-Protected
- ADR-050 Historical Imports Require Approval
- ADR-051 External Identity Is Preserved in Database
- ADR-052 Optimistic Concurrency
- ADR-053 Operational Plans Are Structured Data
- ADR-054 Templates Are Snapshotted
- ADR-055 Audit Records Are Redacted
- ADR-056 Reference Seeds Are Idempotent
- ADR-057 Step 5 Schema Without Step 4 Keeps Mutations Off

## Operational intelligence (ADR-058–067)

- ADR-058 Operational Intelligence Precedes Final UI
- ADR-059 Deterministic Rules Before AI
- ADR-060 Workflow Applications Are Versioned
- ADR-061 Readiness Is Explainable
- ADR-062 Critical Blockers Override Numeric Scores
- ADR-063 Suggestions Require Human Approval
- ADR-064 Historical Patterns Use Reviewed Evidence
- ADR-065 Conflicts Are Advisory
- ADR-066 Readiness and Completion Are Separate
- ADR-067 Command Summaries Are Permission-Filtered

## Authenticated operations unlock (ADR-068–074)

Burt script IDs ADR-061–067 for this unlock collide with Step 5.5; repository uses ADR-068–074:

- ADR-068 Authenticated Actor Comes Only From the Server Session
- ADR-069 Authorization Is Action-Based
- ADR-070 Authentication and Authorization Are Separate
- ADR-071 Mutation Responses Use Safe Projections
- ADR-072 Operational Intelligence Applies Through Ordinary Mutations
- ADR-073 Candidate Data Remains Disabled After Technical Unlock
- ADR-074 Netlify Fails Closed Without Session Secret

## Deployment proof (ADR-075–080)

Burt Step 5.7 ADR labels 068–073 map here to avoid collisions:

- ADR-075 Production Authentication Requires an Explicit Runtime Secret
- ADR-076 Deployment Proof Uses Synthetic Data Only
- ADR-077 Proof Mode Cannot Bypass Security
- ADR-078 Operator Acceptance Is a Separate Gate
- ADR-079 Step 6 Depends on Deployed Mutation Proof
- ADR-080 Proof Records Must Be Isolated

## Calendar Completion program (ADR-081–087)

Locked 2026-07-21 from Burt discovery + Steve acceptance (`KCCC_CALENDAR_COMPLETION_PROGRAM.md`):

- ADR-081 Import Field Precedence on Fingerprint Change
- ADR-082 ICS Feeds Are Private and Signed
- ADR-083 CC-08 Ships Time Grid Before Drag-and-Drop
- ADR-084 Feed Redaction of Private Residences
- ADR-085 Source-Deleted Events Remain CANCELLED History
- ADR-086 Calendar Completion Program Locked CC-01 through CC-12
- ADR-087 CC-01 Provenance Contracts Reusable by CC-02 Without Combining Deliverables
- ADR-088 Calendar Completion Passes Must Measurably Improve the Calendar
- ADR-089 CC-02 Integrity Console Detects Without Auto-Mutating Events
- ADR-090 Kelly CC-05-Only Waiver of Unfinished Usability Synthesis Gate (2026-07-22) — `KCCC_CC_05_WAIVER_KELLY_2026-07-22.md`
- ADR-091 Post-CC-05 Operator Usability Pass 1 and Synthesis 1 remain required; Synthesis stays EMPTY (2026-07-22) — `KCCC_POST_CC05_USABILITY_PASS_DIRECTION.md`
- ADR-092 Kelly Authorization of CC-06 Conflict Engine Calendar Slice (2026-07-22) — `KCCC_CC_06_AUTHORIZATION_KELLY_2026-07-22.md`
- ADR-093 Phase Two Intelligent Statewide Campaign Calendar Vision Locked After CC-12 (2026-07-22) — `KCCC_PHASE_TWO_VISION_LOCK_KELLY_2026-07-22.md`
- ADR-094 Standing Kelly Execution Authorization for Calendar Completion Ship Cycles (2026-07-22) — `KCCC_STANDING_KELLY_EXECUTION_AUTHORIZATION_2026-07-22.md`
- ADR-095 Kelly Authorization of CC-07 Unified Search, Filters, and Saved Views (2026-07-22) — `KCCC_CC_07_AUTHORIZATION_KELLY_2026-07-22.md`
- ADR-096 Kelly Authorization of CC-08 Advanced Day/Week Scheduling Workspace (2026-07-22) — `KCCC_CC_08_AUTHORIZATION_KELLY_2026-07-22.md`
- ADR-097 Kelly Authorization of CC-09 Bulk Operations, Archive/Restore, and Recovery (2026-07-22) — `KCCC_CC_09_AUTHORIZATION_KELLY_2026-07-22.md`
- ADR-098 Kelly Authorization of CC-10 ICS Export & Subscription Privacy (2026-07-22) — `KCCC_CC_10_AUTHORIZATION_KELLY_2026-07-22.md`
- ADR-099 Kelly Authorization of CC-11 Calendar Health Dashboard & Forensic Automation (2026-07-23) — `KCCC_CC_11_AUTHORIZATION_KELLY_2026-07-23.md`
- ADR-100 Kelly Authorization of CC-12 Mobile Hardening, Print Day Sheets & Accessibility (2026-07-23) — `KCCC_CC_12_AUTHORIZATION_KELLY_2026-07-23.md`
- ADR-101 Kelly Product-Owner Acceptance of CC-01–CC-12 Baseline & Post–CC-12 Gate Resolution (2026-07-23) — `KCCC_POST_CC12_PRODUCT_OWNER_ACCEPTANCE_AND_PHASE_TWO_AUTHORIZATION_KELLY_2026-07-23.md`
- ADR-102 Kelly Authorization of IC-01 Arkansas Campaign Geography Foundation (2026-07-23) — `KCCC_IC_01_AUTHORIZATION_KELLY_2026-07-23.md`
- ADR-103 Phase Two AI Quality Gate Accepted for Foundation (2026-07-23) — `KCCC_PHASE_TWO_AI_QUALITY_GATE.md`

## Standing execution (ADR-094)

Approved Calendar Completion and authorized IC build scripts authorize the full ship cycle without routine confirmation. Hard stops remain for destructive prod-data ops, missing credentials, purchases, scope expansion, and privacy/legal barriers.

## Post–CC-12 / Phase Two authorization (ADR-101…103)

- **ADR-101** — Product-owner operational acceptance of CC-01…CC-12; human gate `ACCEPTED_BY_PRODUCT_OWNER_WITH_CONTINUING_OBSERVATION`; Pass 1 blank / Synthesis EMPTY preserved; not fabricated research.
- **ADR-103** — AI quality gate `REVIEWED_AND_ACCEPTED_FOR_PHASE_TWO_FOUNDATION`; sixteen eval categories; per-feature eval before AI enablement; IC-01 has zero OpenAI calls.
- **ADR-102** — **IC-01 only**; no OpenAI, RedDirt, Mobilize, people platform, auto priority, or Event/Mission create; IC-02…IC-12 separately sequenced.

## CC-12 authorization

Kelly **ADR-100** authorized **CC-12 only** under standing execution **ADR-094**. CC-12 is **COMPLETE**. Operator Usability Synthesis 1 remains **EMPTY** (never filled). Human usability gate resolved under **ADR-101** with continuing observation.

## CC-11 authorization

Kelly **ADR-099** authorizes **CC-11 only** under standing execution **ADR-094**. Observe/explain health runs, findings, alerts, and scheduled ingress — no auto Event/Mission repair, no ICS feed rotate/revoke, no conflict auto-resolve writes. Operator Usability Synthesis 1 remains **EMPTY** / incomplete.

## CC-10 authorization

Kelly **ADR-098** authorizes **CC-10 only** under standing execution **ADR-094**. Private signed feeds; no public anonymous ICS; no exact residential addresses in export. Operator Usability Synthesis 1 remains **EMPTY** / incomplete. **CC-11** is COMPLETE under ADR-099.

## CC-07 authorization

Kelly **ADR-095** authorizes **CC-07 only** under standing execution **ADR-094**. Operator Usability Synthesis 1 remains **EMPTY** / incomplete. **CC-08** is a separate deliverable and is not absorbed by CC-07.

## CC-06 authorization

Kelly **ADR-092** authorized **CC-06 only**; the calendar-slice build is now **COMPLETE** (validated, shipped). Operator Usability Synthesis 1 remains **EMPTY** / incomplete — still required as usability evidence, not satisfied by ADR-090 or ADR-092.

## Phase Two (after CC-12)

**ADR-093** locks the Intelligent Statewide Campaign Calendar vision (**IC-01…IC-12**). Program: `KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md`.  
CC-01…CC-12 are **COMPLETE**. Phase Two foundation is **IC_PHASE_AUTHORIZED** (ADR-101 + ADR-103); **IC-01** is **COMPLETE** (ADR-102). Deterministic services own facts/authorization/consent/coverage/conflicts/permissible actions; AI explains and recommends within confirmation boundaries.

## CC-05 / CC-06 / CC-10 / CC-11 / CC-12 baseline & next engineering

CC-01…CC-12 are **COMPLETE**. **IC-01** is **COMPLETE** (ADR-102). Next: **IC-02 NOT_AUTHORIZED** (design handoff only). IC-03…IC-12 remain **NOT_AUTHORIZED**.
