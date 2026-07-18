# Risk Register

Machine-readable: `data/risk_register.json`

Env/security: RISK-016–025.  
Visibility: RISK-029–036.  
Import/entry: RISK-037–046.  

## Database foundation (RISK-047–058)

- RISK-047 Shared DB migration damages RedDirt — mitigated (schema + snapshots)
- RISK-048 Duplicate events across calendars — mitigated (canonical + memberships)
- RISK-049 Command Calendar unreadable — open (roll-up/views)
- RISK-050 Permission section leaks — open until Step 4 membership resolution
- RISK-051 Import duplicates — mitigated (external identities)
- RISK-052 Templates rewrite history — mitigated (snapshots)
- RISK-053 Concurrent overwrite — mitigated (version field)
- RISK-054 Audit stores secrets — mitigated (redaction)
- RISK-055 Relational complexity — open
- RISK-056 Location exposure — mitigated (disclosure + projection)
- RISK-057 Import ≠ attendance — mitigated (distinct flags)
- RISK-058 Wrong-target migration — mitigated (preflight/classify)

## Authenticated operations unlock (RISK-075–078)

- RISK-075 Client supplies mutation actor — mitigated (session-only actor)
- RISK-076 Authenticated assumed authorized — mitigated (action authorize + default deny)
- RISK-077 Netlify missing APP_SESSION_SECRET — open (fail closed; operator)
- RISK-078 Technical unlock ≠ candidate data — mitigated (`candidate_data_ready: false`)
