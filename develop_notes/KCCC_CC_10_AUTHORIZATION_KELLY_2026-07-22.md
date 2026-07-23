# Kelly Authorization — CC-10 ICS Export & Subscription Privacy

```text
ADR:           ADR-098
Date:          2026-07-22
Authority:     Explicit Kelly execution script
Standing:      ADR-094
Scope:         CC-10 only
CC-09 release: f8186be · deploy 6a612a7cba0c57774db91b5f
```

Kelly explicitly authorizes implementation and full ship cycle of **CC-10: ICS Export & Subscription Privacy**, including planning, code, forward-only migration `20260722180000_cc10_ics_export_subscription`, validation, documentation, commit, push, Netlify deployment, corrective follow-ups, redeployment, and live verification.

## Authorized actions
- One-time ICS export (authenticated operator download / preview)
- Private signed subscription feeds (tokenized URL; hash-at-rest)
- Privacy profiles: `BUSY_ONLY` · `CITY_ONLY` · `OPERATIONAL_REDACTED`
- Feed create / rotate / revoke with access audit
- ETag / `304 Not Modified` and feed rate limits
- RFC 5545 subset serialization with stable UIDs

## Forbidden in CC-10
- Public anonymous feeds (no token / no path secret) — ADR-082
- Exact residential / street addresses in ICS — ADR-084
- Hard delete of Events or Missions
- External calendar write-back / two-way sync
- **CC-11** Health Dashboard & Forensic Automation implementation
- **Phase Two** IC-01…IC-12 implementation (vision only — ADR-093)

Usability Synthesis remains **EMPTY**. ADR-093 Phase Two remains vision only. CC-09 remains **COMPLETE** and is not reopened by this authorization.
