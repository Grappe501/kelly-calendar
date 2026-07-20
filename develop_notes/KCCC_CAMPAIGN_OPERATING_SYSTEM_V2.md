# KCCC Campaign Operating System — Version 2 Direction

**Status:** CAPTURED  
**Date:** 2026-07-19  
**Google integration:** PAUSED (OAuth + import + sync infrastructure retained; Routes disabled)  
**First slice:** **V2.1 Events Become Missions** — see `KCCC_V2_1_EVENTS_BECOME_MISSIONS.md`

## Pivot

Stop treating KCCC as a scheduling calendar. Treat it as a **Campaign Operating System** where the calendar is one timeline inside a decision-support system.

Questions the product must answer:

- What am I trying to accomplish today?
- Who do I need to meet?
- What promises are still outstanding?
- What preparation will make this event successful?
- What should I do immediately afterward?

## Already built (do not rebuild)

- OAuth framework + secure credential storage
- Calendar architecture + Mission Card shells
- Historical import / sync engine (dry-run ready; apply gated)
- Routes / mileage framework (**disabled**)

Nothing else in KCCC depends on live Google today. Resume Google when production callback / Cloud Console redirect is sorted.

## Phased direction

| Phase | Name | Intent |
|------:|------|--------|
| 1 | Campaign Intelligence Layer | Every event gains why: county, purpose, priority, audience, media, budget, follow-ups — CRM timeline, not just time |
| 2 | Mission Cards | Day surface becomes operational mission (goal, message, people, media, leave-behind checklist) |
| 3 | Travel Intelligence | Travel packets (fuel, meals, weather, hotels, literature) without requiring Google Routes |
| 4 | Campaign Briefing AI | Pre-event brief: demographics, history, promises, press, expected Q&A |
| 5 | After Action Reports | Post-event capture → durable searchable intelligence |
| 6 | Relationship Timeline | Person-centric history across meetings, donations, orgs, commitments |
| 7 | Campaign War Room | Mission Control / victory meter — command center, not month grid |

## Version 2 major leap (chosen)

Transform each event into a rich campaign **mission** with preparation, execution, and follow-up intelligence — more valuable for a statewide campaign than more scheduling mechanics.

## Hard constraints while paused

- Do not require Google Calendar or Routes for Phases 1–3.
- Do not invent campaign facts (Never Fake / Unknown).
- Prefer extending existing Mission Card / event projection surfaces over new sprawl.
- Keep Architecture 1.0 and Feature Freeze discipline unless Steve authorizes a Version 2 slice.

## Resume Google later

1. Confirm Cloud Console redirect: `https://kelly-calendar.netlify.app/api/integrations/google/calendar/callback`
2. Connect as `kelly@kellygrappe.com` / `calendar.readonly`
3. Dry-run historical import from 2025-11-01; review; then apply
