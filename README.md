# Kelly Campaign Command Calendar (KCCC)

**Status:** **Engineering Chapter 1 CLOSED** · Baseline **1.0 Frozen** · Phase **Evidence Acquisition**

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\Kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Production | https://kelly-calendar.netlify.app |
| Chapter 1 | **CLOSED** — [`KCCC_ENGINEERING_CHAPTER_1_CLOSED.md`](develop_notes/KCCC_ENGINEERING_CHAPTER_1_CLOSED.md) |
| Baseline | **1.0 Frozen** — ready for observation |
| Milestone | [`develop_notes/KCCC_CAMPAIGN_OS_BASELINE_1_0_FROZEN.md`](develop_notes/KCCC_CAMPAIGN_OS_BASELINE_1_0_FROZEN.md) |
| Active gate | **Operator Usability Pass 1 + Synthesis 1** (ADR-091; bring evidence, not bugs) |
| Next authority | **Operator evidence** — not design intuition |
| Canonical entity | **Prisma `Event` only** |
| Ship baseline | `main` @ `46a72c3` · Netlify `6a60efa8f25804bc9b16f3f3` (CC-01…CC-05) |
| CC-05 | **Complete** under ADR-090 — Synthesis remains **EMPTY** |
| CC-06 | **Complete** — Conflict Engine (calendar slice) under Kelly ADR-092; Synthesis remains **EMPTY** |
| CC-07 | **Design only** — not authorized for engineering |
| Candidate data | **Enabled for authorized roles** |
| Communications OS | **Frozen** |
| Roadmap | [`develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md`](develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md) |
| Post-CC-05 direction | [`develop_notes/KCCC_POST_CC05_USABILITY_PASS_DIRECTION.md`](develop_notes/KCCC_POST_CC05_USABILITY_PASS_DIRECTION.md) |
| Usability pass | [`develop_notes/KCCC_OPERATOR_USABILITY_PASS_1.md`](develop_notes/KCCC_OPERATOR_USABILITY_PASS_1.md) |
| Synthesis | [`develop_notes/KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md`](develop_notes/KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md) — **EMPTY** |
| Observation cadence | [`develop_notes/KCCC_OPERATOR_OBSERVATION_CADENCE.md`](develop_notes/KCCC_OPERATOR_OBSERVATION_CADENCE.md) |
| Step 13 architecture | [`develop_notes/KCCC_EA_13_CONFLICT_ENGINE_ARCHITECTURE.md`](develop_notes/KCCC_EA_13_CONFLICT_ENGINE_ARCHITECTURE.md) — calendar slice IMPLEMENTED (CC-06, ADR-092); remaining EA-13 types design only |
| Layers | [`develop_notes/KCCC_OPERATIONAL_VS_INTELLIGENCE_LAYERS.md`](develop_notes/KCCC_OPERATIONAL_VS_INTELLIGENCE_LAYERS.md) |
| Doctrine #1 | [`develop_notes/KCCC_CAMPAIGN_OS_DOCTRINE_1.md`](develop_notes/KCCC_CAMPAIGN_OS_DOCTRINE_1.md) — operator defines reality; system interprets |
| Baseline 1.0 | [`develop_notes/KCCC_CAMPAIGN_OS_BASELINE_1_0_FROZEN.md`](develop_notes/KCCC_CAMPAIGN_OS_BASELINE_1_0_FROZEN.md) — frozen immutable snapshot |
| Chapter closeout | [`develop_notes/KCCC_ENGINEERING_CHAPTER_CLOSEOUT_BASELINE_1_0.md`](develop_notes/KCCC_ENGINEERING_CHAPTER_CLOSEOUT_BASELINE_1_0.md) |
| Chapter 1 closed | [`develop_notes/KCCC_ENGINEERING_CHAPTER_1_CLOSED.md`](develop_notes/KCCC_ENGINEERING_CHAPTER_1_CLOSED.md) — formal record; evidence acquisition |
| Event architecture | [`develop_notes/KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL.md`](develop_notes/KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL.md) |
| Operating views | [`develop_notes/KCCC_EA_10_CALENDAR_OPERATING_VIEWS.md`](develop_notes/KCCC_EA_10_CALENDAR_OPERATING_VIEWS.md) |
| Create / edit | [`develop_notes/KCCC_EA_11_EVENT_CREATION_EDITING.md`](develop_notes/KCCC_EA_11_EVENT_CREATION_EDITING.md) |

## Local validation

```powershell
cd H:\SOSWebsite\Kelly-calendar
npm run calendar:canonical:validate
npm run auth:validate
npm run governance:validate
npm run typecheck
```
