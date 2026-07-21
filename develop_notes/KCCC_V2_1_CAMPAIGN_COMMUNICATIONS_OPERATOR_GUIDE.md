# KCCC — Campaign communications operator guide (D20 + D21 context)

## Principles

1. **Consent is documented, not inferred** — channel **and** purpose must match stored evidence.
2. Kelly Calendar does **not** infer consent from RSVP, attendance, staffing, check-in, or prior participation.
3. Staffing assignments are **operational relevance** only — they do not grant outreach permission.
4. Mobilize signup/attendance aggregates are **never** person-level audience sources.
5. **Export ≠ sent ≠ delivered.** **Handoff ≠ sent ≠ delivered.**
6. External provider dispatch is **disabled** at D21 ship — use export or manual handoff; see D21 dispatch guide for foundation status.
7. Page loads do not seed policy, create drafts, or materialize audiences.

## Who

Campaign leadership roles (`assertLeadership` / full calendar access) for policy seed, drafts, audience review, approvals, queue prepare, export, handoff, consent evidence, and suppressions.

## Before first use

1. Apply migration when schema not yet present:

```bash
KCCC_ALLOW_SCHEMA_MIGRATION=1 node scripts/apply-campaign-communications-migration.mjs
```

2. Run validation:

```bash
npm run missions:v21:communications:validate
npm run typecheck
```

3. Expect **zero** D20 rows until intentional operator actions.

## Workflow — Policy

1. First intentional policy ensure creates version 1 with conservative defaults (`externalDispatchEnabled: false`).
2. Review allowed channels, purposes, and accepted evidence map before any outreach planning.
3. Do not enable operator attestation or external dispatch without D22 provider selection and production-readiness checklist.

## Workflow — Draft communication

1. Create draft with explicit **title**, **channel**, and **purpose**.
2. Optionally link Mission, Event, staffing plan/requirement, campaign date, and Mobilize event URL.
3. Mobilize links must reference a verified local `ExternalObjectReference` — never title-only or guessed IDs.
4. Update subject/body; content fingerprint changes invalidate content approvals.

## Workflow — Audience materialization

1. Choose **explicit** candidate sources only:
   - `STAFFING_ASSIGNMENTS` — requires Mission or staffing plan link
   - `CAMPAIGN_USERS`
   - `MANUAL`
   - `CONSENT_CONTACTS`
2. Review eligibility states per member:
   - `ELIGIBLE` — qualifying verified contact + evidence (rare until evidence recorded)
   - `INELIGIBLE` / `MISSING_CONTACT` — expected for staffing-sourced candidates without contact/consent
   - `SUPPRESSED` — active suppression wins
   - `UNVERIFIED` — contact exists but not operator-verified when policy requires verification
   - `REQUIRES_REVIEW` — e.g. shared contact conflict under `REQUIRE_REVIEW` mode
   - `AMBIGUOUS` — identity or external match unresolved
3. Set inclusion:
   - `INCLUDED` — normal inclusion for queue
   - `EXCEPTION_INCLUDED` — requires operator note; re-checked at queue prepare
   - `EXCLUDED` — removed from send set
4. Heed warnings `SOURCE_NOT_CONSENT:*` for staffing/RSVP/attendance/check-in sources.

## Workflow — Approvals

1. **Audience approval** — fingerprint must match current audience snapshot.
2. **Content approval** — fingerprint must match current subject/body/link snapshot.
3. Approvals are separate by default; both required before queue prepare.
4. Content or audience changes invalidate stale approvals and may mark communication `STALE`.

## Workflow — Queue prepare

1. Run prepare only after valid audience + content approvals.
2. Queue builds idempotent items for `INCLUDED` and `EXCEPTION_INCLUDED` members.
3. `PREPARED` — passed eligibility at prepare time.
4. `BLOCKED` — suppression, missing contact, unverified contact, or missing consent.
5. Communication status becomes `QUEUED` — still **nothing sent**.

## Workflow — Export (allowed)

1. Export generates CSV of **PREPARED** queue items (masked destination refs — not raw PII in audit metadata).
2. Items move to `EXPORTED`; communication status `EXPORTED`.
3. Treat exported files as leaving Kelly Calendar controls — secure, minimize retention, do not re-import as “delivered.”

## Workflow — Manual handoff (allowed)

1. Provide `handedOffToLabel` (e.g. “Volunteer coordinator — phone tree”).
2. **PREPARED** items move to `HANDED_OFF`.
3. Record is operational handoff only — not proof of delivery.

## Workflow — Consent evidence

1. Record per **contact point**, **channel**, and **purpose**.
2. Prefer `EXPLICIT_OPT_IN` with source note and effective dates.
3. `UNKNOWN` evidence is stored for audit but **never** makes someone eligible.
4. Revoke or supersede evidence when consent is withdrawn — do not delete history.

## Workflow — Suppressions

1. Record opt-out, do-not-contact, bounce, complaint, privacy hold, or manual policy suppressions.
2. Channel-specific or all-channel; optional purpose scope.
3. Suppressions evaluated before positive eligibility — they win over evidence.
4. Revoke suppression only with documented reason when contact requests re-contact **and** new evidence is recorded.

## Workflow — Mobilize event links

1. Use Mobilize URLs for **content** (signup links) when purpose is `MOBILIZE_SIGNUP_LINK` or similar.
2. Link local `mobilizeEventReferenceId` from D16/D17 external references.
3. Do **not** attempt to send messages through Mobilize — no general messaging API.

## Workflow — Staffing integration (D19)

1. Staffing assignments may populate **candidates** for `MISSION_STAFFING` purpose.
2. `MANUAL_SCOPED` contact hints on assignments are **not** consent.
3. Confirm staffing separately; confirm outreach consent separately.

## Workflow — Dispatch (D21 foundation)

Production dispatch is **not available** at D21 ship. When evaluating future enablement:

1. Complete D20 queue prepare and obtain **dispatch** approval in addition to content and audience.
2. Review D21 preflight — expect blocking reasons until provider selected and gates opened.
3. Use bounded batches only (max 25) — no background queue.

See `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md` and `KCCC_V2_1_COMMUNICATIONS_PROVIDER_SELECTION_GUIDE.md`.

## Validation before ship / after changes

```bash
npm run missions:v21:communications-dispatch:validate
npm run typecheck
```

## Privacy

- Previews use HTML-escaped content; exports sanitize formula injection.
- Destinations displayed masked in UI and audit-friendly exports.
- No Mobilize PII roster in comms surfaces.
- No consent inferred from Mobilize `sms_opt_in_status`.

See `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md` and `KCCC_V2_1_MOBILIZE_ATTENDANCE_PRIVACY_OPERATOR_GUIDE.md`.

## Do not

- Auto-send email or SMS from Kelly Calendar until production-readiness checklist complete.
- Mark queue items `DISPATCHED` or record delivery events without provider/webhook facts.
- Treat export or handoff as delivery confirmation.
- Include staffing-only hints as consent.
- Use aggregate Mobilize counts as recipients.
- Enable external dispatch without D22 provider selection and kill-switch authorization.

## Rollback

See `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20_ROLLBACK.md`.
