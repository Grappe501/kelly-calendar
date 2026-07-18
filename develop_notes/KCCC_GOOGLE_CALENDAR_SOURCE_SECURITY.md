# Google Calendar Source Security

- Treat public iCal links as sensitive configuration
- Never commit source URLs; never show full URL on status pages after validation
- HTTPS only; Google host allowlist; reject localhost/private IPs
- Redirect limit, timeout, max response size
- Manifests store fingerprints only
- Logs redact identifiers
