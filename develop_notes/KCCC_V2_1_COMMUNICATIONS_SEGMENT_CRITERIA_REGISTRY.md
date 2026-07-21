# KCCC V2.1 — Communications segment criteria registry

**Scope:** Allowed audience materialization sources (D24)  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_AUDIENCE_RECIPIENT_RESOLUTION_DELIVERABLE_24.md`  
**Prohibited:** `KCCC_V2_1_COMMUNICATIONS_PROHIBITED_SEGMENTATION_POLICY.md`

## Principle

Segment criteria are **registered, parameterized, and auditable** — not free-form queries. Each entry declares data origin, person-first resolution path, default eligibility expectation, and required linkage.

Syntax: registry key + validated params JSON — e.g. `{ "key": "STAFFING_ASSIGNMENTS", "missionId": "..." }`.

## Registry entries (allowed)

| Key | Origin | Params | Person-first | Default expectation |
|-----|--------|--------|--------------|---------------------|
| `STAFFING_ASSIGNMENTS` | D19 assignments | `missionId` and/or `staffingPlanId` | Yes — assigned person/user | Usually `MISSING_CONTACT` / `INELIGIBLE` without consent |
| `CAMPAIGN_USERS` | Campaign user roster | Optional role filter | Yes — user identity | `UNVERIFIED` contact until verified + evidence |
| `MANUAL` | Operator entry | Person ref or contact point ref | Yes | Depends on contact + evidence |
| `CONSENT_CONTACTS` | D20 contact points | Channel, purpose filter | Yes | `ELIGIBLE` only when evidence effective |
| `MANIFEST_RERUN` | Prior approved manifest | `manifestId` | Yes — replays frozen criteria version | Recomputes eligibility; new manifest version |

### `STAFFING_ASSIGNMENTS`

- **Purpose:** Operational relevance — who is tied to a mission shift.
- **Not consent:** Assignments never imply outreach permission.
- **Requires:** Linked Mission or staffing plan on communication.
- **Warnings:** `SOURCE_NOT_CONSENT:STAFFING`.

### `CAMPAIGN_USERS`

- Upserts EMAIL contact points as **UNVERIFIED** when missing.
- Still requires D20 consent evidence for positive eligibility.

### `MANUAL`

- Operator adds known person or contact reference — no bulk paste of raw emails as anonymous list.
- Each manual row must resolve to a person identity or explicit standalone contact point record.

### `CONSENT_CONTACTS`

- Pulls contact points with stored evidence metadata — eligibility recomputed at materialization time.
- Suppressions evaluated first.

### `MANIFEST_RERUN`

- Re-applies criteria from an approved manifest’s definition version.
- Produces **new** manifest snapshot — does not mutate prior manifest.

## Blocked registry keys (reject at validation)

| Key | Reason |
|-----|--------|
| `MOBILIZE_AGGREGATE` | Not person-first |
| `RAW_SQL` | Arbitrary blast vector |
| `CSV_IMPORT` | Unaudited bulk upload |
| `VOTER_FILE_AD_HOC` | Unregistered filter surface |
| `RSVP_LIST` | Consent inference |
| `ATTENDANCE_LIST` | Consent inference |
| `CHECKIN_LIST` | Consent inference |

## Parameter validation

| Rule | Enforcement |
|------|-------------|
| Required params present | Block materialization |
| Unknown param keys | Rejected |
| Cross-campaign scope bleed | Blocked — criteria scoped to `campaignScopeKey` |
| Unlinked staffing criteria | Rejected without mission/plan link |

## Fingerprint

`segmentCriteriaFingerprint` = stable hash of sorted registry keys + canonical param JSON.

Change invalidates audience approval.

## Operator display

UI shows human-readable labels for registry keys — never expose internal SQL or raw warehouse table names.

## Extension process

New registry keys require:

1. Person-first resolution spec  
2. Consent/suppression interaction doc update  
3. Prohibited policy review  
4. Validation fixtures  
5. Governance sign-off before `APPROVED` in registry enum  

## Related

- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md` (D20 sources)  
- `KCCC_V2_1_COMMUNICATIONS_RECIPIENT_RESOLUTION_POLICY.md`
