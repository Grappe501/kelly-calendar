# Cross-Section Data Protection Report

Safe projections omit unauthorized sections and protected location detail.

Proven by validators / unit tests:

- Communications editors do not receive donor/fundraising detail
- Finance editors do not receive protected personal notes
- Field organizers do not receive exact lodging details
- Limited viewers do not receive private address
- Workflow preview / readiness / conflict descriptions sanitize protected evidence
- Audit payloads redact secrets
- API JSON omits hidden unauthorized properties

Command: `npm run protection:cross-section`
