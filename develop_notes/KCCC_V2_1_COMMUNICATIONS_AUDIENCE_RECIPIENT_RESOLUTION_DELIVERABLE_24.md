# KCCC V2.1 — Communications Audience, Segmentation & Recipient Resolution Foundation (Deliverable 24)

**Status:** SHIPPED — audience & resolution foundation — **production dispatch remains blocked**  
**Git:** `main` @ `06e24bd`  
**Netlify:** deploy `6a5f050a7b2b84cb0fe8c0de` · https://kelly-calendar.netlify.app  
**Baseline:** D23 `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md`  
**Parent stack:** D20 consent/queue · D21 dispatch · D22 provider · D23 composition  
**Next:** D25 campaign scheduling & controlled execution  
**Validate:** `npm run missions:v21:communications-audience:validate` (291 tests D1–D24)  
**Seed:** `npm run missions:v21:communications-audience:seed` (sandbox audiences only; approved production audiences = 0)  
**Production dispatch:** **DISPATCH BLOCKED** — unchanged from D20–D23 ship state

## Governing objective

Build the canonical system for defining audiences, applying registered segment criteria, resolving person-first recipients, producing immutable recipient manifests, and attaching resolved context to D20 queue items and D23 dispatch artifacts — **without** production send, arbitrary SQL/CSV blast, consent inference, or collapsing audience policy into composition or provider adapters.

## Canonical boundary

```text
Audience proposes candidates.
Consent and suppression decide eligibility.
Dispatch decides transport.
```

| Layer | Question | Must not |
|-------|----------|----------|
| **D24 Audience** | Who might receive this? | Send, schedule, infer consent, call vendors |
| **D20 Consent / suppression** | Do we have permission? | Accept unregistered segment SQL; auto-include without review |
| **D23 Composition** | What does the message say? | Select audience; resolve bulk recipients |
| **D21 Dispatch** | May it be dispatched? | Rewrite audience; bypass manifest fingerprint |
| **D22 Adapter** | Which provider transports it? | Segment, dedupe, or normalize destinations |

## Architecture — Audience → Manifest → Queue → Artifact

```text
Communication Brief / CampaignCommunication
        ↓
Audience Definition              (intent + registered segment criteria)
        ↓
Segment Criteria Application     (explicit sources only — no ad hoc SQL)
        ↓
Candidate Materialization        (person-first rows with eligibility facts)
        ↓
Consent & Suppression Gate       (D20 engine — wins over inclusion intent)
        ↓
Destination Normalization        (channel-specific contact points)
        ↓
Recipient Deduplication          (one queue slot per person + channel)
        ↓
Immutable Recipient Manifest     (snapshot + fingerprints — append-only)
        ↓
Operator Review & Inclusion      (INCLUDED | EXCEPTION_INCLUDED | EXCLUDED)
        ↓
Audience Approval                (binds to manifest fingerprint)
        ↓
D20 Queue Prepare                (idempotent queue items for included only)
        ↓
D23 DISPATCH Artifact Context    (per-item recipient context for tokens)
        ↓
D21 Preflight + D22 Transport    (blocked at D24 ship)
```

## Hard boundaries (non-negotiable at D24 ship)

| Boundary | Rule |
|----------|------|
| Production dispatch | **Blocked** — all D21/D22 gates remain closed |
| Automatic sending | None — no auto-send on manifest, approve, or page load |
| Arbitrary SQL / CSV blast | **Forbidden** — only registered segment criteria and explicit operator sources |
| Consent inference | Never from RSVP, attendance, staffing, check-in, Mobilize aggregates |
| Person model | **Person-first** — one human identity per resolution path; no aggregate Mobilize rows as recipients |
| Manifest immutability | Approved manifests are append-only snapshots; edits create new manifest version |
| Preview data | **FABRICATED TEST DATA** only — never real voter contacts for casual preview |
| Adapter / renderer audience logic | Zero — composition and adapters receive resolved context only |
| D20 doctrine | Consent evidence and suppressions remain authoritative; D24 does not bypass |

## Deliverable scope (D24 includes)

1. Audience definition model bound to `CampaignCommunication` and optional D23 brief  
2. Registered segment criteria registry (explicit sources — no free-form query)  
3. Person-first candidate materialization with eligibility fact recomputation  
4. Destination normalization per channel (email E.164 / SMS rules)  
5. Recipient deduplication policy (person + channel + campaign scope)  
6. Immutable recipient manifest contract with content/audience fingerprints  
7. Consent and suppression integration (read D20; never infer)  
8. Audience approval workflow separate from content and dispatch approvals  
9. Queue prepare integration — manifest fingerprint drives D20 `audienceFingerprint`  
10. Recipient context attachment for D23 token resolution and `recipientFingerprint`  
11. Prohibited segmentation policy enforcement  
12. Operator audience workspace, governance docs, validation suite, rollback  

## Deliberate exclusions (not D24)

Production sending · campaign scheduling · recurring sends · send-time optimization · A/B audience splits · lookalike modeling · voter-file arbitrary filters · warehouse SQL · CSV upload-as-audience · Mobilize outbound lists · auto-consent · public preference-center expansion · inbound list sync · generative audience suggestions · cross-campaign list merge without review.

## Domain model (additive migration — expected)

Expected migration: `20260721XXXXXX_v21_communications_audience_recipient_resolution`

| Model | Role |
|-------|------|
| `CommunicationAudienceDefinition` | Stable audience identity linked to communication |
| `CommunicationAudienceDefinitionVersion` | Immutable criteria snapshot (registered keys + params) |
| `CommunicationSegmentCriteriaApplication` | Audit of which registry entries were applied |
| `CommunicationRecipientCandidate` | Person-first row with eligibility facts (mutable until manifest) |
| `CommunicationRecipientManifest` | Immutable approved snapshot + fingerprints |
| `CommunicationRecipientManifestEntry` | One resolved person/channel row in manifest |
| `CommunicationAudienceApproval` | Decision bound to exact manifest hash |

D20 `CampaignCommunicationAudienceMember` remains the queue-facing row; D24 manifest materialization **feeds** or **reconciles** audience members — D24 does not replace D20 consent tables.

## Segment criteria (registered only)

| Registry key | Purpose |
|--------------|---------|
| `STAFFING_ASSIGNMENTS` | Mission/staffing-linked candidates — relevance only |
| `CAMPAIGN_USERS` | Active campaign users |
| `MANUAL` | Operator-entered person references |
| `CONSENT_CONTACTS` | Contact points with stored evidence |
| `MANIFEST_RERUN` | Re-apply prior approved manifest criteria (new version) |

**Blocked:** `MOBILIZE_AGGREGATE`, `RAW_SQL`, `CSV_IMPORT`, `VOTER_FILE_AD_HOC`.

See `KCCC_V2_1_COMMUNICATIONS_SEGMENT_CRITERIA_REGISTRY.md`.

## Fingerprints

| Fingerprint | Scope |
|-------------|--------|
| `segmentCriteriaFingerprint` | Hash of registered criteria + params |
| `manifestFingerprint` | Hash of manifest entries (identity + destination refs + inclusion) |
| `audienceFingerprint` | D20 queue fingerprint — must match approved manifest at prepare |
| `recipientFingerprint` | Per-item identity context for D23 artifact match |

Manifest or criteria change invalidates audience approval → `STALE`.

## Integration with D20 / D23 / D21

- **D20:** D24 writes candidate rows and manifest snapshots; D20 consent engine evaluates eligibility; queue prepare uses manifest-backed `audienceFingerprint`.  
- **D23:** `DISPATCH` artifacts require `recipientFingerprint` from D24-resolved context; preview uses **FABRICATED TEST DATA** only.  
- **D21:** Preflight reads queue fingerprints — does not re-segment. Idempotency key unchanged: `dispatch:{provider}:{queueItemId}:{contentFingerprint}:{audienceFingerprint}`.

## Validation (expected)

```bash
npm run missions:v21:communications-audience:validate
npm run missions:v21:communications-composition:validate
npm run missions:v21:communications-dispatch:validate
npm run typecheck
```

## Operator and companion docs

| Doc | Use |
|-----|-----|
| `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_OPERATOR_GUIDE.md` | Day-to-day audience workflow |
| `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_GOVERNANCE.md` | Audience lifecycle and ownership |
| `KCCC_V2_1_COMMUNICATIONS_SEGMENT_CRITERIA_REGISTRY.md` | Allowed criteria and parameters |
| `KCCC_V2_1_COMMUNICATIONS_PROHIBITED_SEGMENTATION_POLICY.md` | Forbidden segmentation |
| `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_RESOLUTION_POLICY.md` | Resolution order and facts |
| `KCCC_V2_1_COMMUNICATIONS_DESTINATION_NORMALIZATION.md` | Email/phone normalization |
| `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_DEDUPLICATION.md` | Dedup rules |
| `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_CONSENT_AND_SUPPRESSION.md` | Eligibility gates |
| `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_MANIFEST_CONTRACT.md` | Manifest immutability |
| `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_APPROVAL_GUIDE.md` | Review and sign-off |
| `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24_ROLLBACK.md` | Rollback |

## Acceptance criteria

- [x] Registered segment criteria only — ad hoc SQL/CSV paths rejected at API  
- [x] Person-first materialization; Mobilize aggregate sources blocked  
- [x] Consent/suppression evaluated before positive eligibility — no inference  
- [x] Destination normalization deterministic; masked display in audit UI  
- [x] Deduplication produces one manifest entry per person + channel  
- [x] Immutable manifest snapshots; approval binds to manifest fingerprint  
- [x] Audience approval separate from content and dispatch approvals  
- [x] Queue prepare uses manifest-backed audience fingerprint  
- [x] D23 dispatch artifacts accept D24 recipient context; preview uses **FABRICATED TEST DATA**  
- [x] **Zero production messages sent**  
- [x] Rollback documented; D20–D23 behavior preserved when D24 disabled  

## D25 preview — Campaign scheduling & orchestration

**Recommended D25:** Communications Campaign Scheduling & Send Orchestration Foundation.

| Deliverable | Question |
|-------------|----------|
| **D24** | Who is eligible to receive it? |
| **D25** | When and under what campaign send plan? |
| **D23** | What are we saying? |
| **D20** | Do we have permission? |
| **D21** | May it be dispatched? |
| **D22** | Which provider transports it? |

D25 will attach timing, batch windows, and campaign-level send plans to **already-resolved** manifests — without reopening segmentation or consent doctrine.

## Related

- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20.md` (D20)  
- `KCCC_V2_1_COMMUNICATIONS_TEMPLATE_COMPOSITION_DELIVERABLE_23.md` (D23)  
- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md` (D21)  
- `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md`
