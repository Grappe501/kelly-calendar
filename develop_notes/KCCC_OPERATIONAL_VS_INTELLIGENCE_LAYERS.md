# KCCC — Operational vs Intelligence Layers

```text
Status: STANDING ARCHITECTURE (implements Campaign OS Doctrine #1)
Doctrine: develop_notes/KCCC_CAMPAIGN_OS_DOCTRINE_1.md
Further doctrine: HOLD until Operator Observation Pass 1 complete
```

## Doctrine #1 (canonical)

> **The operator defines reality. The system interprets reality.**

Full statement, responsibilities, module test, and recommendation presentation pattern:  
`develop_notes/KCCC_CAMPAIGN_OS_DOCTRINE_1.md`

---

## Two layers

### Operational Layer — the operator defines reality

| Concern | Steps (indicative) |
|---------|-------------------|
| Calendar & canonical Event | 8–11 |
| Operating views | 10 |
| Event create / edit / lifecycle | 11 |
| Availability & standing rules | 12 |

Writes change the schedule only through authorized operator (or explicitly approved) actions.

### Intelligence Layer — the system interprets reality

| Concern | Steps (indicative) |
|---------|-------------------|
| Conflict detection & explanation | **13 (first intelligence layer)** |
| Travel feasibility | 13 / 17 |
| Mission readiness | 14+ |
| AI briefing / debrief | 16 / 18 / 19 |
| Schedule optimization | later |

Intelligence may detect, explain, recommend, and simulate. It does **not** silently mutate Events.

---

## Governing rule (locked)

> **The system may detect, explain, recommend, and simulate—but it never changes the operator's schedule without explicit approval.**

Consistent with Doctrine #1 and observation cadence (evidence before expanding intelligence).

---

## Progression (do not disturb)

```text
1. Foundation              — complete (Steps 8–11)
2. Operator validation     — in progress (Pass 1 + synthesis)
3. Scheduling intelligence — Step 12 awaiting evidence
4. Operational intelligence — Step 13 architected; implement after Step 12
5. Campaign intelligence   — missions, relationships, briefings, travel, AI
```

Next **code** should follow observation → synthesis → Step 12 authorization.

---

## Related

- Doctrine #1: `KCCC_CAMPAIGN_OS_DOCTRINE_1.md`
- Step 13 architecture: `KCCC_EA_13_CONFLICT_ENGINE_ARCHITECTURE.md`
- Observation cadence: `KCCC_OPERATOR_OBSERVATION_CADENCE.md`
- Roadmap: `KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md`
