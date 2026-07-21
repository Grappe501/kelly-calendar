# KCCC V2.1 — Communications Template, Personalization & Composition Foundation (Deliverable 23)

**Status:** SHIPPED — composition foundation only — **production dispatch remains blocked**  
**Git:** `main` @ `f4212ed`  
**Netlify:** deploy `6a5eff30965de8272dd45eb7` · https://kelly-calendar.netlify.app  
**Validate:** `npm run missions:v21:communications-composition:validate` (276 tests D1–D23)  
**Seed:** `npm run missions:v21:communications-composition:seed` (sandbox templates only)  
**Baseline:** D22 `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`  
**Parent stack:** D20 queue/consent · D21 dispatch · D22 provider abstraction  
**Next:** D24 shipped — see `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`. Recommended D25: campaign scheduling & controlled execution.  
**Production dispatch:** **DISPATCH BLOCKED** — unchanged from D20–D22 ship state

## Governing objective

Build the canonical system for creating, rendering, previewing, validating, approving, versioning, and attaching communications content to dispatch batches.

D23 owns **what the approved communication says**. D24 will own **who is eligible to receive it**. D20 owns permission. D21 owns dispatch policy. D22 owns transport.

## Canonical boundary

```text
Composition creates approved rendered artifacts.
Dispatch transports approved rendered artifacts.
```

Provider adapters **transport** already-rendered canonical messages. They **must not** decide message content, rewrite links, inject footers, or resolve personalization tokens.

Dispatch must never accept arbitrary raw message text from a provider adapter, webhook, browser request, or unapproved draft.

## Architecture — Composition → Artifact → Dispatch

```text
Mission / Event / Follow-up
        ↓
Communication Brief          (intent — not dispatchable)
        ↓
Template Selection           (approved template version)
        ↓
Composition Draft            (editable revision trail)
        ↓
Personalization Resolution   (registered tokens only)
        ↓
Canonical Renderer           (provider-neutral, server-side)
        ↓
Validation & Policy Review
        ↓
Human Approval               (binds to exact revision hash)
        ↓
Immutable Rendered Artifact    (purpose: PREVIEW | TEST | APPROVAL | DISPATCH)
        ↓
D20 CampaignCommunication    (queue, consent, suppressions — unchanged doctrine)
        ↓
D21 Dispatch Preflight       (artifact + D20 gates + kill switches)
        ↓
D22 Provider Adapter         (CanonicalProviderMessage transport only)
        ↓
Vendor API
```

| Layer | Owns | Must not |
|-------|------|----------|
| **Composition** | Templates, drafts, tokens, render, approval, artifacts | Send, schedule, select audience, call vendors |
| **D20** | Consent, suppressions, queue prepare, export/handoff | Infer consent; accept unapproved raw body for dispatch |
| **D21 Dispatch** | Preflight, bounded batches, kill switches, idempotency | Edit message content; bypass artifact contract |
| **D22 Adapter** | Vendor payload shape, credentials, webhooks | Token resolution, HTML assembly, link rewriting |

## Hard boundaries (non-negotiable at D23 ship)

| Boundary | Rule |
|----------|------|
| Production dispatch | **Blocked** — all D21/D22 gates remain closed |
| Automatic sending | None — no auto-send on approve, render, or page load |
| Provider content logic | Zero — adapters receive `CanonicalProviderMessage` only |
| Unsourced personalization | Blocked — only registered tokens with documented sources |
| Invented recipient data | Preview uses **FABRICATED TEST DATA** profiles only |
| Unapproved templates | Only sandbox-test template versions may ship as `APPROVED` |
| Client-side secrets | No provider credentials or raw destinations in browser bundles |
| Adapter rendering | No rendering inside provider adapters |
| Consent / suppression bypass | D20 checks remain mandatory at dispatch preflight |
| Draft → dispatch shortcut | Forbidden — only `DISPATCH` purpose artifacts attach |

## Deliverable scope (D23 includes)

1. Template catalog and channel-aware immutable versions  
2. Communication briefs and composition drafts with revision trail  
3. Canonical personalization token registry and resolver  
4. Email and SMS rendering (subject, HTML, plain text, SMS body)  
5. Validation, link inspection, compliance profiles  
6. Fabricated preview profiles (labeled **FABRICATED TEST DATA**)  
7. Immutable render artifacts and composition approval workflow  
8. Dispatch-layer attachment via `communicationRenderArtifactId`  
9. Operator composition workspace and audit trail  
10. Validation suite: `npm run missions:v21:communications-composition:validate`  
11. Companion docs (this set) and rollback procedure  

## Deliberate exclusions (not D23)

Production sending · scheduling · recurring campaigns · automated audience selection · generative AI copywriting · provider failover · open/click analytics · public preference-center expansion · inbound reply processing · automatic translation · A/B testing · multistep journeys · mass segmentation · click tracking / URL rewriting.

## Domain model (additive migration)

Expected migration: `20260720XXXXXX_v21_communications_template_composition`

| Model | Role |
|-------|------|
| `CommunicationTemplate` | Stable template identity (`templateKey`, channel, purpose, status) |
| `CommunicationTemplateVersion` | Immutable approved versions (subject/html/text/sms templates, tokens, compliance profile) |
| `CommunicationBrief` | Why the communication exists — links Mission/Event; not dispatchable |
| `CommunicationComposition` | Editable draft bound to brief + template version |
| `CommunicationCompositionRevision` | Immutable revision snapshots |
| `CommunicationRenderArtifact` | Immutable render output; only `DISPATCH` purpose eligible for attempts |
| `CommunicationCompositionApproval` | Decision bound to exact revision + content hash |

Approved template versions and dispatch artifacts are **immutable**. Edits create new draft versions or invalidate prior approval.

## Render artifact purposes

| Purpose | Use | Dispatch eligible |
|---------|-----|-------------------|
| `PREVIEW` | Operator preview with fabricated data | **No** |
| `TEST` | Sandbox drill with allowlisted destinations | **No** (sandbox path only) |
| `APPROVAL` | Reviewer sign-off snapshot | **No** |
| `DISPATCH` | Attached to D21 attempt | **Yes** — when all gates pass |

Preview and test renders must display **FABRICATED TEST DATA** when not using real allowlisted sandbox recipients.

## Integration with D20 content fingerprint

D23 extends D20 `contentFingerprint` semantics: dispatch preflight verifies artifact `contentHash` matches queue item expectations and that composition approval is valid. Legacy D20 subject/body fields remain for export/handoff until a communication is fully composition-backed.

## Dispatch preflight additions (D23)

Beyond existing D21 codes, preflight must verify:

- Artifact exists and purpose is `DISPATCH`  
- Artifact not invalidated  
- Composition revision approved; hash matches  
- Recipient fingerprint matches artifact  
- Channel matches provider capability  
- All D20 consent/suppression/approval gates  
- All D21 kill switches and D22 provider gates  
- **Production dispatch remains blocked** at D23 ship  

Blocking codes (representative): `MISSING_RENDER_ARTIFACT` · `ARTIFACT_WRONG_PURPOSE` · `ARTIFACT_INVALIDATED` · `COMPOSITION_NOT_APPROVED` · `ARTIFACT_HASH_MISMATCH` · `RECIPIENT_FINGERPRINT_MISMATCH` · `ARTIFACT_CHANNEL_MISMATCH`

## Validation

```bash
npm run missions:v21:communications-composition:validate
npm run missions:v21:communications-dispatch:validate
npm run missions:v21:communications-provider:validate
npm run typecheck
```

## Operator and companion docs

| Doc | Use |
|-----|-----|
| `KCCC_V2_1_COMMUNICATIONS_COMPOSITION_OPERATOR_GUIDE.md` | Day-to-day composition workflow |
| `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_GOVERNANCE.md` | Template lifecycle and ownership |
| `KCCC_V2_1_COMMUNICATIONS_TOKEN_REGISTRY.md` | Allowed tokens and privacy classes |
| `KCCC_V2_1_COMMUNICATIONS_PERSONALIZATION_POLICY.md` | Resolution order and fallbacks |
| `KCCC_V2_1_COMMUNICATIONS_RENDERING_AND_SANITIZATION.md` | Renderer rules |
| `KCCC_V2_1_COMMUNICATIONS_COMPOSITION_APPROVAL_GUIDE.md` | Review and sign-off |
| `KCCC_V2_1_COMMUNICATIONS_LINK_SAFETY_GUIDE.md` | Link inspection |
| `KCCC_V2_1_COMMUNICATIONS_EMAIL_COMPLIANCE_PROFILES.md` | Email footers and requirements |
| `KCCC_V2_1_COMMUNICATIONS_SMS_COMPLIANCE_PROFILES.md` | SMS STOP/help and length |
| `KCCC_V2_1_COMMUNICATIONS_DISPATCH_ARTIFACT_CONTRACT.md` | D21/D22 transport contract |
| `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23_ROLLBACK.md` | Rollback |

## Acceptance criteria

- [ ] Canonical EMAIL and SMS templates with immutable approved versions  
- [ ] Briefs and compositions are separate; approved versions cannot be edited in place  
- [ ] Registered token system; required-token failures block render; prohibited tokens blocked  
- [ ] Server-side HTML sanitization; plain-text email generated; SMS segment estimates shown  
- [ ] Links inspected and recorded in link manifest; compliance profiles enforced  
- [ ] Fabricated preview profiles labeled **FABRICATED TEST DATA**  
- [ ] Approval binds to exact revision and content hash; edits invalidate approval  
- [ ] Immutable `DISPATCH` artifacts generatable; D21 accepts only eligible artifacts  
- [ ] D22 adapters receive `CanonicalProviderMessage` only — no content decisions  
- [ ] Sandbox test path operable; **zero production messages sent**  
- [ ] All D1–D22 tests pass; D23 suite passes; typecheck and build pass  
- [ ] Rollback documented; secret/client-bundle scans pass  

## D24 preview — Audience & recipient resolution

**Recommended D24:** Communications Audience, Segmentation & Recipient Resolution Foundation.

| Deliverable | Question |
|-------------|----------|
| **D23** | What are we saying? |
| **D24** | Who is eligible to receive it? |
| **D20** | Do we have permission? |
| **D21** | May it be dispatched? |
| **D22** | Which provider transports it? |

D24 will materialize recipient contexts for token resolution and queue attachment without collapsing audience policy into the renderer or adapters.

## Related

- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md` (D20)  
- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md` (D21)  
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md` (D22)  
- `KCCC_V2_1_COMMUNICATIONS_PRODUCTION_ENABLEMENT_CHECKLIST.md` (post-D22 go-live — not opened by D23)
