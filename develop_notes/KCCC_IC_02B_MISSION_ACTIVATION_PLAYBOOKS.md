# IC-02B — Mission Activation Playbooks and Department Operations

```text
Status:       COMPLETE
Authorization: ADR-106 · KCCC_IC_02B_AUTHORIZATION_KELLY_2026-07-23.md
Build:        KCCC-IC-02B-MISSION-ACTIVATION-PLAYBOOKS-1.0
Migration:    20260723160000_ic02b_mission_activation_department_operations
Validator:    npm run operations:activation:validate
Baseline:     55cfdab
Feature:      f65f701
Deploy:       6a625302ec18d79a68dcc0bf
Production:   https://kelly-calendar.netlify.app
```

## Product

Every Mission can optionally apply an Activation Playbook (None / Minimal / Standard / Major / Custom). Apply generates dated department tasks. Preview and Mission page reads create **zero** records.

## Ship evidence (2026-07-23)

- Feature commit: `f65f701`
- Netlify deploy: `6a625302ec18d79a68dcc0bf`
- `operations:activation:validate` 48 pass
- DB proof 8 pass (counts restored)
- tsc / build / secret scan green
- IC-02A validator remains green


## Playbook options

| Level | Behavior |
|-------|----------|
| NONE | Zero department tasks |
| MINIMAL | Event basics + hot-wash owner |
| STANDARD | Full §6 timeline (48h save-the-date, week-before, weekend canvass, texting, day-of, IC-02A) |
| MAJOR | Standard + press + fundraising support |
| CUSTOM | Uses major template as starting point |

## Safeguards

- automatically assigned volunteers: 0
- externally sent emails: 0
- externally sent texts: 0
- published social posts/Events: 0
- purchased advertisements: 0
- RedDirt writes: 0
- OpenAI calls: 0
- fabricated delivery results: 0

## Routes

- `/system/missions/[missionId]/activation`
- `/system/operations` (+ events, communications, volunteers, logistics, field, tasks, notifications, templates)

## Decisive proof

Preview + apply Standard once → one plan and intended tasks; identical fingerprint reapply → zero duplicates; no external actions; Event/Mission schedule unchanged.

## Related

- Rollback · Operator guide · Standard template · Style system · ADR-106
