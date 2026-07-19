# Calendar Foundation (Engineering Track A.4)

**Script ID:** `KCCC-CAL-EXP-FOUNDATION`  
**Track:** Engineering Track A · Calendar Experience  
**Status:** PLANNED — **not started**; after Audit → Hardening → Experience Redesign 2.0  
**Architecture:** 1.0  
**Prerequisite:** V1 ENGINEERING COMPLETE · Audit exit · Hardening exit · Experience Redesign acceptance (or recorded waiver)  


## Purpose

Shared presentation layer reused by Day, Week, Month, and all future specialized views.

**Owns nothing.** Provides consistent rendering, legend, filters, and interaction patterns over existing canonical data.

## Scope

| Capability | Intent |
|------------|--------|
| Shared event rendering | One event cell / row contract for all views |
| Common legend | Normative categories (Campaign Event, Travel, Volunteer, Media, Fundraising, Petition, Compliance, Deadline, Personal, Unknown) |
| Filter engine | Saved / quick filters (All, Executive, Field, Travel, Volunteer, Finance, Communications, Compliance, Candidate) |
| Search | Find events/missions without new ownership |
| Date navigation | Shared prev/next/jump primitives |
| Keyboard shortcuts | Operator speed on Day/Week/Month |
| Print / PDF | Operator export of current view |
| Responsive behavior | Mobile + desktop density rules |
| Accessibility | Legend, contrast, focus, labels |

## EA-3 requirements (Platform Quality)

Must absorb before Agenda / Timeline / Mission (see `KCCC_EA3_PLATFORM_QUALITY.md`):

1. Shared catalogue load + `cataloguePartial` helper  
2. Shared mission-context batching (kill Week/Month dupe — HL-016)  
3. Adopt one event presentation path (`SafeEventBlock` or successor)  
4. Shared travel / county / volunteer summary presenters (consume-only)  
5. `CalendarPageChrome` + hero slot for XR-01  
6. Documented Foundation API contracts (HL-020) so V2 views implement against the platform, not clones

## Out of scope

- Agenda / Timeline / Mission view builds (follow Foundation)  
- Phase 3 integrations  
- New systems of record  
- Synthesizing Unknown into false readiness  

## Architecture 1.0 Conformance Statement

Relies on Constitution §3–§5 (ownership unchanged; presentation may assemble), §6 (Unknown), Trust Model T6/T9.  
**Affirms:** No amendments to Architecture 1.0 baseline (`6690ce2`).

## Exit

Foundation is complete when Day, Week, and Month consume the shared legend + filter + event rendering contracts without view-local forks for those concerns. Only then open Agenda View.
