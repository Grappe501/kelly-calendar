# Calendar Availability Doctrine (CC-05)

**Version:** `CC-05-1.0`
**Authorization:** ADR-090 (Kelly waiver, CC-05 scope only)

## Governing rule

> Standing availability is an **input, evaluation, and warning** layer. It
> **detects and explains**; it never **decides, moves, or resolves**.

This mirrors the existing `SCHEDULE_MUTATION_GOVERNING_RULE`:
`DETECT_EXPLAIN_RECOMMEND_SIMULATE_NEVER_AUTO_MUTATE`.

## Classification model

| Classification | Meaning | Severity | Blocks save | Requires ack |
|---|---|---|---|---|
| `AVAILABLE` | Open for scheduling | informational | no | no |
| `PREFERRED` | Operator-preferred window | informational | no | no |
| `CONSTRAINED` | Possible but costly (buffer, protected-adjacent) | warning | no | no |
| `UNAVAILABLE` | Standing block (office hours, vacation, blackout) | blocking | yes | yes |
| `REQUIRES_REVIEW` | Malformed input (e.g. end before start) | warning | yes | yes |
| `UNKNOWN` | No approved active rule/exception covers this time | warning | no | no |

**Precedence when multiple intervals overlap the same proposed time:** the
hardest classification wins — `UNAVAILABLE` > `REQUIRES_REVIEW` >
`CONSTRAINED` > `PREFERRED` > `AVAILABLE` > `UNKNOWN`. An `ACTIVE` exception
covering the same day always contributes its own interval and can out-rank
a rule (e.g. a one-day `AVAILABLE` exception opening an otherwise
`UNAVAILABLE` office-hours block).

**Silence is not availability.** If no `ACTIVE` rule or exception applies
to a proposed time at all, the result is `UNKNOWN`, not `AVAILABLE`.

## Overlap semantics

Intervals are **half-open** `[startsAt, endsAt)`. An event that starts the
instant a rule interval ends does **not** overlap it. Buffers
(`bufferBeforeMinutes` / `bufferAfterMinutes`) expand the rule's protected
interval before overlap is computed — they are not separate findings.

## Precedence between rule types (advisory only)

Rule `priority` (lower = more specific/harder) is stored per rule but the
evaluator's actual winner is determined by **classification precedence**
above, not by `priority` — `priority` is currently advisory metadata for
operators ordering the rules list, reserved for future tie-breaking logic
if CC-06 needs it. This is documented here so it is not mistaken for an
enforced ranking.

## Timezone and DST

All local windows are declared in a rule/exception's own `timezone`
(default `America/Chicago`) using `HH:mm` wall time and expanded through
the shared CC-03 temporal service (`resolveWallTime`,
`chicagoWallTimeToUtc`). Wall time stays stable across DST transitions —
"09:00 America/Chicago" is 09:00 local on both sides of a spring-forward
or fall-back boundary; only the UTC offset changes.

## Fingerprints

- `ruleFingerprint` / `exceptionFingerprint` — stable hash of the
  substantive fields of a rule/exception (not id, not sensitive reason).
  Recomputed on every create/update.
- `ruleSetFingerprint` — hash of all `ACTIVE` rule/exception fingerprints
  used in one evaluation. Changes whenever the active rule set changes.
- `evaluationFingerprint` — hash of `ruleSetFingerprint` + the proposed
  interval + timezone + all-day flag + event status + subject type.
  This is what an acknowledgement is pinned to — if the rule set or the
  proposed time changes, the fingerprint changes and a stale
  acknowledgement will not silently satisfy the new evaluation.

## Approval lifecycle (rules)

`DRAFT` → `ACTIVE` (via `approveRule`, requires full calendar access) →
`INACTIVE` (via `deactivateRule`). Only `ACTIVE` + `isActive` rows are used
in evaluation. Exceptions are created directly `ACTIVE` (one-off, lower
risk) and moved to `CANCELLED` via `cancelException`.

## Hard boundaries (binding, ADR-090)

1. CC-05 code never writes `OperationalConflictRecord` or any other CC-06
   persisted artifact.
2. CC-05 code never mutates `Event.status`, `Event.startsAt/endsAt`, or any
   `CampaignMission` field as a side effect of evaluation or
   acknowledgement.
3. Acknowledgement records intent (audited); it does not change what the
   next evaluation will report — the rule set is the source of truth.
