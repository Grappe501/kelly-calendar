# CC-12 design handoff — Mobile Hardening, Print Day Sheets & Accessibility

**Status:** Design handoff only — **NOT AUTHORIZED** for implementation  
**Predecessor:** CC-11 COMPLETE (ADR-099) — ship `d570dc6` / deploy `6a61aa30fc4c865f2bd3c628`  
**Authority required:** Separate Kelly execution script

## Intent

Harden calendar surfaces for mobile operators, printable day sheets, and accessibility (keyboard, contrast, semantics) without changing Event/Mission mutation doctrine.

## Binding constraint

CC-12 is a **presentation and usability** build. It must not reopen CC-11 auto-repair, ICS privacy defaults, bulk hard-delete, or Phase Two IC features.

## Out of scope until authorized

- Phase Two IC-01…IC-12 implementation
- Drag/resize mutation (still gated separately from CC-08 posture)
- Public anonymous ICS feeds
- Auto-repair from health findings
