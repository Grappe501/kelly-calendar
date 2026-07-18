# Risk Register

Machine-readable source: `data/risk_register.json`

## Visibility doctrine

- RISK-029 Limited display reveals sensitive details (mitigated via safe view + tests)
- RISK-031 Hidden events cause scheduling confusion (mitigated — occupied time stays visible)
- RISK-032 Browser receives protected fields (mitigated — server sanitization)
- RISK-033 Exact location exposure (mitigated — CITY default)
- RISK-034 Calendar category reveals too much (open — safe category names)
- RISK-035 Multi-calendar membership leaks strategy (mitigated — primary label only)
- RISK-036 Limited access mistaken for missing info (mitigated — text notice)

Federation: RISK-027 (siloed apps), RISK-028 (command noise), RISK-030 (external sync).

Env/security: RISK-016–025.
