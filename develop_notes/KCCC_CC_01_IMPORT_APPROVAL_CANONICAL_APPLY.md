# CC-01 — Import Approval → Canonical Apply

```text
Build ID:     KCCC-CC-01-IMPORT-APPROVAL-CANONICAL-APPLY-1.0
Program:      KCCC-CALENDAR-COMPLETION-PROGRAM-1.0
Status:       COMPLETE
Baseline:     main @ 7bba401
Completed:    2026-07-22
Size:         Large
Depends on:   Existing import staging + fingerprints + auth mutation gate
Feeds:        CC-02 provenance/audit reuse (contracts only — not combined scope)
```

## Mission

Make staged Google/iCal import records become canonical `Event` rows under operator approval, with idempotent fingerprints and full audit—closing the largest hole between “import exists” and “calendar is dependable.”

## Decisive success test

> Approve one staged import and create exactly one canonical Event; repeat the same import and create zero additional Events; merge and reject paths remain explicit and audited; no Mission or external calendar mutation occurs.

## Current evidence

- `src/server/services/import-approval-service.ts` — `approveImportRecord` / `rejectImportRecord` / `mergeImportRecord` are auth-gated stubs  
- Staging, fingerprints, IMPORT_ONLY OAuth, and review UI foundation already exist  
- Manual ingests populate the Event graph; the external sync **apply** path does not  

## Scope (keep small)

| In | Out |
|----|-----|
| Transactional **approve** → Event + primary membership + `ExternalEventIdentity` + status history + audit | Google write-back / two-way sync |
| **Reject** with reason + audit | Mobilize mutation |
| **Merge** onto an existing canonical Event + audit | Mission creation (unless existing project-on-confirm policy already applies elsewhere — do not add new Mission side effects here) |
| Unchanged fingerprint → **idempotent no-op** (zero new Events) | Integrity / provenance **console UI** (CC-02) |
| Operator-visible run summary of apply results | Bulk repair of historical HOLD clones (CC-02) |
| Provenance + audit **contracts** reusable by CC-02 | Combining CC-01 and CC-02 |

## Non-negotiable invariants

1. **Event remains schedule SoR.**  
2. **No silent Mission creation** as part of approve/merge/reject.  
3. **No external calendar mutation** (IMPORT_ONLY preserved).  
4. **Re-import / re-approve of unchanged fingerprint creates zero additional Events.**  
5. Field precedence on fingerprint **change** follows **ADR-081** (local title/notes/status; source timing only if never manually rescheduled).  
6. Source-deleted mapping (when detected on later sync) follows **ADR-085** — `CANCELLED` with provenance (detection may land with apply hooks; full console is CC-02).  
7. No secrets or real PII in git proofs, docs, or test fixtures.  

## Expected models / reuse

Reuse: `CalendarImportRun`, `CalendarImportRecord`, `ExternalEventIdentity`, `Event`, existing membership + status history writers.  
Extend only if required: review action enums / apply-result fields on import records. Prefer **no** migration unless a status field is truly missing.

## Expected routes / surfaces

- Finish `/api/imports/.../approve|reject|merge` (or current import API paths already wired)  
- Review UI actions on Google/iCal import review  
- Event sheet link to external identity / import provenance (minimal; full console = CC-02)

## Validation plan

| Check | Expectation |
|-------|-------------|
| Approve one staged record | Exactly **+1** canonical Event |
| Repeat same import / same fingerprint | **+0** Events |
| Reject path | No Event; audited rejection |
| Merge path | No second Event; membership/identity linked; audited |
| Mission count | Unchanged by approve/reject/merge |
| External source | Unchanged (no write-back) |
| Commands | `import:validate`, `import:staging:validate`, unit tests for fingerprint idempotency |

## Documentation on ship

- Mark CC-01 complete in `KCCC_CALENDAR_COMPLETION_PROGRAM.md` / `build_state.json`  
- Update import runbook  
- Note inventory: import-apply COMPLETE; integrity console still CC-02  

## Rollback

Feature-flag or auth-gate disable approve/merge mutations; leave staging intact; soft-cancel Events created under a failed-batch tag only if operator-authorized recovery requires it.

## Ship criteria

- Decisive success test green in staging/prod-safe synthetic proof  
- Merge + reject audited  
- Netlify production deploy green  
- No PII in proofs  
- CC-02 still a separate authorized deliverable  

## Completion evidence (2026-07-22)

| Check | Result |
|-------|--------|
| Typecheck | PASS |
| Unit tests (mapper + capabilities) | PASS |
| `import:validate` / `import:staging:validate` | PASS |
| `calendar:canonical:validate` | PASS |
| `import:apply:proof` | PASS — approve +1 Event, re-approve +0, reject/merge +0, missions unchanged |
| Surfaces | `/import/google-calendar/apply`, approve/reject/merge APIs |
| Provenance contracts | `src/lib/calendar/import-provenance.ts` (CC-02 reusable) |
| CC-02 | Still a separate deliverable |

