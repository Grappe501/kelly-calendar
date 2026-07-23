# KCCC — HSV ingest source alignment repair (2026-07-22)

**Status:** COMPLETE  
**Branch:** `main`  
**Scope:** Ingest **source** alignment only (not Calendar Completion CC-09).

## Original issue

HSV lodging-gate, host-meeting operations, and travel-pointer content must live on three verified canonical Events. Source scripts needed to match that placement so future ingest does not swap or duplicate blocks.

## Invalid evidence (do not cite)

`scripts/tmp-hsv-verify.mjs` failed because `DATABASE_URL` was unavailable; Prisma never queried Events. That run is **not** successful verification. The temporary script was removed and must remain absent.

Independent DB confirmation (via established `run-with-h-drive-env` + approved env loader) established placement before this source repair.

## Confirmed canonical placement

| Purpose | ingestKey | Canonical Event | Source file |
|--------|-----------|-----------------|-------------|
| Lodging + gate text | `lodging-hsv-host-2026-07-22` | `KCCC-2026-0040` | `scripts/ingest-observation-pass.mjs` |
| Host meeting ops | `hsv-dems-road-to-blue-2026-07-23` | `KCCC-2026-0039` | `scripts/ingest-observation-pass.mjs` |
| Travel pointer | `travel-hsv-2026-07-22` | `KCCC-2026-0025` | `scripts/ingest-operator-pass3.mjs` |

**Invariants**

- `0040` may hold lodging-gate text; must not hold Road-to-Blue schedule/cake ops or travel-only authority.
- `0039` may hold host meeting ops; must not hold full gate access block.
- `0025` may hold a gate **pointer** to lodging/`0040`; must not duplicate lodging-gate or host-ops bodies.

## Source-script correction

- Observation pass: speaking notes carry schedule/cake/reserved seating; lodging notes carry `GATE ACCESS` / sponsor / authorized days (no cell digits in git).
- Pass3 travel: gate pointer to `lodging-hsv-host-2026-07-22` (`KCCC-2026-0040`); explicit “do not duplicate” guard.
- Reusable validator: `scripts/validate-hsv-ingest-placement.mjs` + `npm run calendar:hsv-placement:validate`.

## Dry-run result

Command: `npm run calendar:hsv-placement:validate`

- Targets examined: `KCCC-2026-0040`, `KCCC-2026-0039`, `KCCC-2026-0025`
- Proposed changes: **none** (all noop — DB already matched markers)
- Missing targets: **0**
- Ambiguous/mismatched numbers: **0**
- Unrelated Events affected: **0**

Proof: `develop_notes/database_proofs/hsv-ingest-source-alignment-latest.json`

## Idempotency result

- Validator dry-run run twice: both **54 passed / 0 failed**, both noop.
- `--apply` path: refused blind overwrite when markers incomplete; when markers complete → **no mutations**.
- Full `events:ingest:observation-pass` was **not** re-run against production DB for this repair: it always UPDATEs matching keys and would risk wiping richer privateNotes provenance (e.g. prior HSV-JULY-DETAILS markers / operator CRM-only fields). Source alignment + marker validation is the intended safe path.

## Database verification method

Established workflow only:

```bash
npm run calendar:hsv-placement:validate
# equivalent:
node scripts/run-with-h-drive-env.cjs node scripts/validate-hsv-ingest-placement.mjs --dry-run
```

Never prints `DATABASE_URL`. Resolves Events by `ingestKey` prefix in `privateNotes`, then asserts event numbers and required/forbidden tokens.

## Count proof (validator before/after)

| Metric | Result |
|--------|--------|
| Total Event delta | **0** (235 → 235) |
| Mission delta | **0** (37 → 37) |
| Event/Mission-link delta | **0** (no link writes) |
| Date/time changes | **0** |
| Status changes | **0** |
| External writes | **0** |
| Fabricated records | **0** |
| New Events / Missions | **0** |
| Duplicate text from this pass | **0** |

## Regression

| Check | Result |
|-------|--------|
| `calendar:hsv-placement:validate` | PASS (54) |
| `events:analyze:duplicates` | PASS (0 ingestKey dupes) |
| `calendar:canonical:validate` | PASS |
| `import:staging:validate` | PASS |
| `npm run typecheck` | PASS |
| Production Next build | **not run** — script/docs only; no app runtime packaging change |

## Deployment decision

**Netlify deploy: unnecessary.** Changes are operator ingest scripts, a local validator, npm script wiring, and develop_notes. They are not part of the Netlify Next.js runtime bundle and do not change production ingest behavior (ingest remains blocked on Netlify without `KCCC_ALLOW_OPERATOR_LIVE_INGEST=true`).

## Commit

`ceed4b5` — `fix(calendar): align HSV ingest source placement` (pushed `main`).

## Return path

After this repair, resume authorized **CC-09** posture (already COMPLETE); do not reopen CC-09 unless a later script authorizes it.
