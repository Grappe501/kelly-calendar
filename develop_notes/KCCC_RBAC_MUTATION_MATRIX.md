# RBAC Mutation Matrix (Step 5.6)

Policy engine: `authorize(actor, { action, resource })` — default **DENY**.

Leadership (`KELLY`, `CAMPAIGN_MANAGER`) → administer path.

| Actor | Event create | Basic edit | Communications | Fundraising | Travel | Workflow apply | Conflict override | Role management |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Kelly | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Campaign Manager | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Communications Lead | Limited | Limited | Yes | No | Limited | Limited | No | No |
| Finance Lead | Limited | Limited | No | Yes | Limited | Limited | Limited | No |
| Field Organizer | Scoped | Scoped | Limited | No | Limited | Scoped | No | No |
| County Organizer | County scoped | County scoped | Limited | No | Limited | Scoped | No | No |
| Viewer | No | No | No | No | No | No | No | No |
| Suspended | No | No | No | No | No | No | No | No |
| Anonymous | 401 | 401 | 401 | 401 | 401 | 401 | 401 | 401 |

Validated by `npm run rbac:matrix:validate` and unit authorization tests. Section leakage covered by safe projections + `protection:cross-section`.
