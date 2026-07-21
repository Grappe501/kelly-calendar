# KCCC V2.1 — Communications audience operator guide

**Scope:** Day-to-day audience, segmentation, and recipient resolution (D24)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`  
**D20 workflow:** `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md`

## Principles

1. **Audience proposes; consent decides; dispatch transports.**  
2. Kelly Calendar does **not** infer consent from RSVP, attendance, staffing, or check-in.  
3. **No arbitrary SQL or CSV blast** — registered segment criteria only.  
4. **Person-first** — every row resolves to a person identity (or explicit contact point).  
5. **Manifests are immutable** — edits create a new manifest version.  
6. Preview samples use **FABRICATED TEST DATA** — never casual real voter lists.  
7. **Export ≠ sent ≠ delivered.** **Approval ≠ send.** Production dispatch **blocked** at D24 ship.  
8. **D25** adds campaign scheduling — not in D24; do not expect schedule-on-approve.

## Who

Campaign leadership (`assertLeadership`) for audience definitions, materialization, manifest review, inclusion decisions, audience approval, and queue prepare.

## Before first use

```bash
npm run missions:v21:communications-audience:validate
npm run missions:v21:communications:validate
npm run typecheck
```

Apply D24 migration when schema not present (see deliverable doc).

## Workflow — Define audience

1. Open communication draft (channel + purpose required).  
2. Create audience definition linked to communication and optional D23 brief.  
3. Select **registered segment criteria** only — see segment registry.  
4. Provide required params (e.g. Mission ID for staffing criteria).  
5. Lock criteria version — changes create new version and stale prior approvals.

## Workflow — Materialize candidates

1. Run materialization — server applies criteria and resolution policy.  
2. Review eligibility facts per row (`ELIGIBLE`, `INELIGIBLE`, `SUPPRESSED`, etc.).  
3. Heed `SOURCE_NOT_CONSENT:*` warnings — record D20 consent evidence as needed.  
4. Do not expect staffing-sourced rows to be eligible without contact + consent.

## Workflow — Review manifest

1. Finalize manifest snapshot when inclusion decisions ready.  
2. Confirm dedupe — one row per person + channel.  
3. Set inclusion:
   - `INCLUDED` — normal  
   - `EXCEPTION_INCLUDED` — requires note; re-checked at prepare  
   - `EXCLUDED` — out of send set  
4. Verify `manifestFingerprint` before requesting audience approval.

## Workflow — Audience approval

1. Complete audience approval checklist (see approval guide).  
2. Separate from content and dispatch approvals.  
3. Approval binds to manifest fingerprint — not informal description in brief.

## Workflow — Queue prepare (D20)

1. Run prepare only with valid audience + content approvals.  
2. D20 re-evaluates consent/suppression — manifest inclusion is not enough alone.  
3. `PREPARED` items ready for export, handoff, or future dispatch — **nothing sent**.  
4. `BLOCKED` items remain auditable — do not delete.

## Workflow — D23 dispatch artifacts

1. After queue prepare, generate `DISPATCH` purpose artifacts per item when composition-backed.  
2. Artifact `recipientFingerprint` must match manifest/queue context.  
3. D21 preflight still blocks production send at ship gates.

## Workflow — Export / handoff (allowed)

Use D20 export or manual handoff when provider dispatch unavailable — same hygiene as D20 guide. Manifest export is leadership-only with masked destinations.

## Prohibited operator actions

- Paste bulk emails as audience  
- Request “run SQL” for targeting  
- Upload CSV recipient lists  
- Treat Mobilize RSVP export as audience source  
- Mark fabricated preview as “live list proof”  
- Assume audience approval sends messages  
- Bypass suppressions via new contact points  

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| All rows INELIGIBLE | Missing consent evidence |
| STALE communication | Manifest or content changed after approval |
| Duplicate rows blocked | Dedupe collision — resolve inclusion |
| REQUIRES_REVIEW | Shared email/phone — operator decision needed |
| Preflight RECIPIENT_FINGERPRINT_MISMATCH | Regenerate D23 artifact after manifest change |

## Next: D25

Campaign scheduling and send orchestration attach **timing** to approved manifests — D25 does not reopen segmentation or consent rules.

## Related docs

| Doc | Topic |
|-----|-------|
| `KCCC_V2_1_COMMUNICATIONS_SEGMENT_CRITERIA_REGISTRY.md` | Allowed criteria |
| `KCCC_V2_1_COMMUNICATIONS_PROHIBITED_SEGMENTATION_POLICY.md` | Forbidden methods |
| `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_CONSENT_AND_SUPPRESSION.md` | Eligibility |
| `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_MANIFEST_CONTRACT.md` | Manifest contract |
| `KCCC_V2_1_COMMUNICATIONS_COMPOSITION_OPERATOR_GUIDE.md` | Message content (D23) |
| `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md` | Dispatch gates (D21) |
