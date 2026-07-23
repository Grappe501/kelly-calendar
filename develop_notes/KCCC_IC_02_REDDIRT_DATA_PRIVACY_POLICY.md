# IC-02 RedDirt Data Privacy Policy

```text
Allowlist version: kccc-reddirt-privacy-ic02.1
Doctrine:          Deny by default
```

## Allowed classifications (IC-02)

- `PUBLIC_GEOGRAPHY` — FIPS, GEOID, county/place labels needed for mapping
- `CAMPAIGN_STRATEGIC` — priority tier, focus-area membership, coverage targets
- `VOLUNTEER_AGGREGATE` — non-identifying capacity aggregates only when useful and permitted

## Denied (must not store)

- Person-level volunteer records
- Names linked to contact information
- Email, phone, street / home addresses
- Personal notes, protected demographics
- Communication preferences as consent
- Unknown custom / hidden provider fields
- Raw sensitive payloads

## Application rules

- Count excluded fields/rows without retaining sensitive values
- Never create `Person`, consent evidence, staffing, or Mobilize person matches from RedDirt
- Status APIs never return credential material
- No `NEXT_PUBLIC_REDDIRT_*`

## Related

- Operator guide: `KCCC_IC_02_REDDIRT_OPERATOR_GUIDE.md`
- Authorization: `KCCC_IC_02_AUTHORIZATION_KELLY_2026-07-23.md` (ADR-104)
