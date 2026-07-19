# Google Calendar Source Security

- Treat public iCal links as sensitive configuration
- Treat **secret private iCal addresses** as passwords (`KCCC_GOOGLE_CALENDAR_ICAL_URL`)
- Never commit source URLs; never show full URL on status pages after validation
- Never paste secret iCal URLs into chat, docs, logs, screenshots, or browser forms
- Diagnostics: `calendarFeedConfigured: yes/no` only — never the value
- HTTPS only; Google host allowlist; reject localhost/private IPs
- Redirect limit, timeout, max response size
- Manifests store fingerprints / redacted labels only (`google-private-ical#fp:…`)
- Logs redact identifiers; private path tokens must never appear in redacted labels
- Secret iCal is **import-only** — push requires Google Calendar API + OAuth (not active)
