# KCCC — Communications composition operator guide (D23)

**Scope:** Template, brief, composition, preview, and artifact workflow  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`  
**Prerequisites:** D20 policy/consent · D21 dispatch awareness · D22 provider sandbox (optional)

## Principles

1. **Composition creates approved rendered artifacts; dispatch transports them.**
2. **Production dispatch remains DISPATCH BLOCKED** at D23 ship — approval ≠ send.
3. Preview uses **FABRICATED TEST DATA** — never real voters for casual template preview.
4. Provider adapters never decide message content.
5. Draft, preview, approved revision, and dispatch artifact are **visually distinct** in the UI.
6. Edits after approval invalidate approval and block new dispatch artifacts.

## Who

Campaign leadership (`assertLeadership` / system admin) for templates, briefs, compositions, approval, and artifact generation. Same role family as D20 communications admin.

## Before first use

1. Apply D23 migration when schema not yet present (command documented in deliverable doc at ship).
2. Run validation:

```bash
npm run missions:v21:communications-composition:validate
npm run missions:v21:communications-dispatch:validate
npm run typecheck
```

3. Expect zero composition rows until intentional operator actions.

## Navigation (composition workspace)

| Path | Purpose |
|------|---------|
| `/system/communications/templates` | Template catalog |
| `/system/communications/templates/new` | New template |
| `/system/communications/templates/[templateId]` | Template detail |
| `/system/communications/briefs` | Communication briefs |
| `/system/communications/compositions` | Active compositions |
| `/system/communications/compositions/[id]/preview` | Rendered preview |
| `/system/communications/compositions/[id]/review` | Approval review |
| `/system/communications/compositions/[id]/artifacts` | Render history |

Dispatch admin remains under existing D21 paths (`/system/communications/dispatch`, providers, controls).

## Workflow — Template

1. Create template with stable `templateKey`, channel, purpose, category.
2. Add **version** (draft) with subject/html/text/sms bodies and required tokens.
3. Submit version for review → approver sets `APPROVED` or `REJECTED`.
4. Only **sandbox test** templates (`TEST_ONLY`) should be pre-approved at initial ship.
5. Campaign-facing templates stay draft until leadership review.

See `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_GOVERNANCE.md`.

## Workflow — Brief

1. Create brief linking Mission and/or Event with objective, audience description, tone.
2. Record `prohibitedClaimsJson` and `requiredContentJson` for reviewer.
3. Set brief `READY_FOR_COMPOSITION` when intent is clear.
4. Brief alone is **not dispatchable**.

## Workflow — Composition

1. Start composition from brief + **approved** template version.
2. Edit subject/html/text/sms drafts; insert tokens from registry menu only.
3. Save creates bounded revisions (not every keystroke — see revision policy in UI).
4. Run **Validate** — fix `BLOCKED` issues before review.
5. **Preview** with fabricated profile — confirm banner **FABRICATED TEST DATA**.
6. Submit for review.

Composition panel sections: Brief · Channel · Template · Revision · Editor · Token inspector · Preview profile · Rendered preview · Validation · Links · Compliance · Approval · Artifacts · Dispatch eligibility (expect **blocked** at ship).

## Workflow — Approval

1. Reviewer opens exact revision (read-only).
2. Verify links, compliance, tokens, segment counts (SMS).
3. Approve → locks revision; or request changes / revoke.
4. Approval does **not** turn on kill switches or production dispatch.

See `KCCC_V2_1_COMMUNICATIONS_COMPOSITION_APPROVAL_GUIDE.md`.

## Workflow — Dispatch artifact

1. After approval, generate **`DISPATCH`** purpose artifact for recipient context.
2. Attach artifact to D20 communication / queue item per integration UI.
3. Complete D20 audience + dispatch approvals and queue prepare (unchanged).
4. D21 preflight validates artifact + all gates — expect **dispatchAvailable: false** at D23 ship.
5. Sandbox drill (optional): use `TEST` artifact + D22 sandbox + allowlisted address only.

See `KCCC_V2_1_COMMUNICATIONS_DISPATCH_ARTIFACT_CONTRACT.md`.

## Workflow — Preview profiles

Use built-in personas only:

Standard supporter · Volunteer · Event attendee · Missing first name · Long name · Unicode name · SMS segment stress · etc.

Every preview render shows **FABRICATED TEST DATA**. Real contacts require sandbox allowlist path — not default preview.

## Email vs SMS editor

| Channel | Editor features |
|---------|-----------------|
| EMAIL | Subject, plain text, constrained HTML, token menu, compliance footer preview, desktop/mobile preview |
| SMS | Text only, live character count, encoding indicator, segment estimate, STOP/help status |

No drag-and-drop page builder in D23 — prioritize auditability over design flexibility.

## When dispatch is blocked (expected at ship)

Preflight may report: `POLICY_EXTERNAL_DISPATCH_DISABLED` · kill switch codes · `PROVIDER_DISPATCH_DISABLED` · plus artifact gates if missing. This is correct — **DISPATCH BLOCKED** until production enablement checklist.

D20 **export and handoff** remain valid fallback paths.

## Do not

- Paste unregistered tokens or raw HTML bypassing sanitization
- Preview with real voter PII
- Assume template approval enables production send
- Edit approved revisions in place — create new version
- Ask provider dashboard to “fix” message copy — edit composition and re-render artifact

## Related docs

| Doc | Topic |
|-----|-------|
| `KCCC_V2_1_COMMUNICATIONS_TOKEN_REGISTRY.md` | Allowed tokens |
| `KCCC_V2_1_COMMUNICATIONS_PERSONALIZATION_POLICY.md` | Resolution rules |
| `KCCC_V2_1_COMMUNICATIONS_RENDERING_AND_SANITIZATION.md` | Renderer |
| `KCCC_V2_1_COMMUNICATIONS_LINK_SAFETY_GUIDE.md` | URLs |
| `KCCC_V2_1_COMMUNICATIONS_EMAIL_COMPLIANCE_PROFILES.md` | Email footers |
| `KCCC_V2_1_COMMUNICATIONS_SMS_COMPLIANCE_PROFILES.md` | SMS STOP/help |
| `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md` | D20 queue |
| `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md` | D21 dispatch |

## D24 note

Recipient eligibility and segmentation move to **D24**. D23 answers **what** the message says; D24 will answer **who** receives the approved composition in bulk queue materialization.
