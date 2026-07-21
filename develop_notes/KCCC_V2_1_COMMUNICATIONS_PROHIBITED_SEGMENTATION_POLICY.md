# KCCC V2.1 — Communications prohibited segmentation policy

**Scope:** Forbidden audience construction (D24)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`  
**Registry:** `KCCC_V2_1_COMMUNICATIONS_SEGMENT_CRITERIA_REGISTRY.md`

## Principle

**Audience proposes; consent decides.** Prohibited segmentation is any method that bypasses person-first resolution, documented consent, operator review, or immutable manifest audit — including convenience paths that resemble “email everyone in this CSV.”

## Absolutely forbidden

| Practice | Why blocked |
|----------|-------------|
| Arbitrary SQL against production DB | Unaudited blast vector; no manifest contract |
| CSV / spreadsheet upload as audience | No person-first lineage; consent unknown |
| Voter-file ad hoc filters without registered criteria | Unreviewed targeting; compliance risk |
| Mobilize aggregate RSVP / attendance lists as recipients | Not person-first; implies consent |
| Auto-include everyone on a mission without review | Skips inclusion operator gate |
| Cross-campaign list merge without explicit review | Scope bleed |
| “Send to all users” without channel/purpose consent check | Violates D20 doctrine |
| Client-side audience assembly from hidden exports | Bypasses server manifest |
| Provider audience sync as source of truth | Adapters transport — they do not define audience |
| Generative / AI-suggested recipient lists | Non-deterministic; unauditable |

## Forbidden inference (consent proxies)

Never use these as **eligibility** or **inclusion** shortcuts:

- Mobilize RSVP status  
- Event attendance / check-in  
- Staffing assignment alone  
- Prior campaign participation  
- Mobilize `sms_opt_in_status` without D20 evidence  
- Email open/click behavior (not in D24 scope)  
- Geographic proximity alone without consent  

These may appear as **warnings** or **relevance hints** only — never auto-`INCLUDED`.

## Forbidden dispatch patterns

| Pattern | Status |
|---------|--------|
| Production blast to unresolved list | Blocked — D21 + D24 |
| Schedule-on-upload | Not D24 — deferred to D25 with gates |
| Retry to alternate channel without re-consent | Blocked |
| Suppression bypass via new contact point | Blocked at normalization + D20 |

## UI and operator prohibitions

- Do not label fabricated preview counts as “live audience size.”  
- Do not show full unmasked destination lists in generic audit views.  
- Do not expose “paste emails here” bulk fields.  
- Do not promise “one-click send” — **production dispatch blocked** at D24 ship.

## Enforcement layers

1. **API** — reject unknown criteria keys and bulk import endpoints  
2. **Materialization** — fail-closed on blocked sources  
3. **Manifest finalize** — validate person-first rows and dedupe contract  
4. **Approval** — compliance reviewer checks prohibited policy  
5. **Queue prepare** — D20 re-evaluates consent/suppression; manifest fingerprint match  

## Exceptions

There is **no** engineering exception for SQL/CSV blast. Operational urgency uses:

1. D20 `MANUAL` / registered criteria with documented consent  
2. D20 export/handoff for out-of-band coordinated outreach  
3. Future D25 scheduling — still on approved manifests only  

`EXCEPTION_INCLUDED` overrides **inclusion** for a known person — not prohibited segmentation method.

## Related

- `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md`  
- `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_GOVERNANCE.md`
