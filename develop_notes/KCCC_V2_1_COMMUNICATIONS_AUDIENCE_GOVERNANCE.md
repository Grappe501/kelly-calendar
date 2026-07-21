# KCCC V2.1 — Communications audience governance

**Scope:** Audience definitions, versions, and manifest lifecycle (D24)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`  
**D20 baseline:** `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20.md`

## Ownership

| Role | Responsibility |
|------|----------------|
| Campaign communications lead | Audience intent, criteria selection, inclusion review |
| Compliance reviewer | Prohibited segmentation checks, consent evidence adequacy |
| Engineering | Registry maintenance, migration integrity, validation suite |

Audience governance does **not** grant dispatch permission. D20 consent, D21 kill switches, and D22 provider gates remain independent.

## Lifecycle

```text
DRAFT definition
  → criteria version locked (immutable snapshot)
  → candidate materialization (recomputable until manifest)
  → manifest snapshot (immutable once finalized for approval)
  → AUDIENCE approval (binds manifest fingerprint)
  → queue prepare (D20)
  → STALE on criteria/manifest/consent change
```

| State | Rule |
|-------|------|
| `DRAFT` | Editable criteria and inclusion; no audience approval |
| `CRITERIA_LOCKED` | Version immutable; may rematerialize candidates |
| `MANIFEST_PENDING` | Operator reviewing manifest entries |
| `MANIFEST_FINALIZED` | Snapshot append-only; new edits require new manifest version |
| `APPROVED` | Audience approval valid for bound manifest fingerprint |
| `STALE` | Underlying facts or fingerprints changed — re-approve required |

## Versioning rules

1. **Criteria versions** are immutable once saved — parameter changes create a new version.
2. **Manifests** are immutable snapshots — never edit rows in place after finalize.
3. **Approvals** bind to exact `manifestFingerprint` — not “latest audience.”
4. **Inclusion overrides** (`EXCEPTION_INCLUDED`) require operator note and appear in manifest audit.

## Registered vs ad hoc

Only **registered segment criteria** from `KCCC_V2_1_COMMUNICATIONS_SEGMENT_CRITERIA_REGISTRY.md` may appear in approved audience definitions.

Ad hoc SQL, CSV uploads, and voter-file arbitrary filters are **governance violations** — blocked at API and rejected in approval review.

## Person-first doctrine

Audiences resolve to **person identities** with channel contact points — not Mobilize event aggregates, not “everyone who RSVP’d” without person-level consent evidence.

External linkage follows D18 rules: `CONFIRMED` match required for positive external person resolution.

## Separation of concerns

| Concern | Owner |
|---------|-------|
| Who might be in the set? | D24 audience (proposes) |
| May we contact them? | D20 consent + suppression (decides) |
| What do we say? | D23 composition |
| May we dispatch? | D21 preflight |
| How is it sent? | D22 adapter |

D24 must not embed message copy, template selection, or provider credentials in audience definitions.

## Preview and test data

Operator previews of audience counts and sample rows use **FABRICATED TEST DATA** or redacted summaries — never export full real recipient lists to casual UI surfaces.

Manifest export for compliance review requires leadership auth and follows D20 export hygiene (masked refs, minimal retention).

## Archival

Cancelled communications preserve audience definitions, manifests, and approvals for audit. Archive — do not hard-delete — unless legal retention policy and Steve authorize purge.

## Related

- `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_APPROVAL_GUIDE.md`  
- `KCCC_V2_1_COMMUNICATIONS_PROHIBITED_SEGMENTATION_POLICY.md`  
- `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_MANIFEST_CONTRACT.md`
