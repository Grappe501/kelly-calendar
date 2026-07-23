# ADR-106 — Mission activation independent of Mission lifecycle

```text
Status: Accepted · 2026-07-23 · IC-02B
```

## Decision

Mission Activation Plans are **optional operating overlays**. Applying, updating, or deactivating a playbook must not start/complete Mission Prepare/Execute/Debrief/Follow-up/Closeout, and must not mutate Event or Mission schedules.

Internal task generation ≠ external action. Tasks may draft communications/content/volunteer needs; they must not send, publish, purchase, enroll, infer consent, or auto-assign people.

Department boards own queues; Volunteer Manager coordinates volunteer participation without taking ownership of every department task.

## Companion principles

- ACKNOWLEDGED does not clear blockers (RESOLVED / ACCEPTED_RISK / NOT_APPLICABLE per policy).
- Never label SENT without verified D20 dispatch evidence.
- Brand tokens remain internal-ops styled (kellygrappe.com themes) without turning boards into public campaign pages.
