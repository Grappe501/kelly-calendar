# Standing Kelly Execution Authorization — Calendar Completion

```text
Decision ID:   ADR-094
Authority:     Kelly Grappe
Date:          2026-07-22
Effective:     2026-07-22
Scope:         Calendar Completion CC-07…CC-12 ship cycles
Status:        ACCEPTED
Program:       KCCC-CALENDAR-COMPLETION-PROGRAM-1.0
Does not:      Authorize Phase Two IC implementation · destructive prod data ops
```

## Decision

Kelly authorizes Burt/Cursor to execute **approved Calendar Completion build scripts** without returning for routine permission to inspect, plan, edit, migrate (forward-only / non-destructive), validate, repair, commit, push `main`, deploy Netlify, monitor, correct, redeploy, verify live routes, or record evidence.

**The build script itself is authorization to complete its full ship cycle.** Burt must not ask Kelly to type “authorize,” “push,” “run,” “deploy,” or similar routine confirmations after receiving an approved build script.

## Authorized sequence (one deliverable per script)

1. CC-07  
2. CC-08  
3. CC-09  
4. CC-10  
5. CC-11  
6. CC-12  
7. Usability and AI-quality gate  

A script for one deliverable does **not** authorize quietly absorbing the next. Once Kelly supplies the next queued script, Burt may begin it without another authorization exchange.

## Phase Two boundary (ADR-093)

- IC-01…IC-12 remain vision/architecture only until CC-12 completes and IC phase is separately authorized.
- CC-07…CC-12 may create clean extension points.
- They may **not** introduce hidden AI, RedDirt, volunteer, Mobilize, push-notification, or expanded personal-data collection features.

## Hard stops (must stop and hand off)

- Destructive or irreversible production-data operation not explicitly in the build script
- Missing or invalid credentials required for completion
- Purchase/contract for an external service
- Material scope expansion beyond the active deliverable
- Unrecoverable merge or data conflict
- Privacy, consent, legal, or security decision not already governed by repository policy
- Evidence the action could materially damage production data
- Platform permission barrier not resolvable through the established workflow

Routine implementation difficulty, test/build/deploy failures, or correctable defects are **not** reasons to stop — diagnose, repair, revalidate, continue.

## Usability Synthesis

Operator Usability Synthesis remains **incomplete / EMPTY**. This standing authorization does **not** mark Synthesis complete.

## Related

- ADR-093 Phase Two vision lock
- ADR-095 CC-07 implementation authorization (this cycle’s deliverable script)
- End-of-pass protocol: `develop_notes/KCCC_END_OF_PASS_GITHUB_AND_NETLIFY.md`
