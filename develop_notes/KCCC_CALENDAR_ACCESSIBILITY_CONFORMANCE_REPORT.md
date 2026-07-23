# KCCC Calendar — Accessibility Conformance Report (CC-12)

```text
Target:     WCAG 2.2 Level AA (target — not a certification claim)
Program:    CC-12 / ADR-100
Date:       2026-07-23
Status:     Automated checks in progress; manual AT pending
```

## Scope

Operator calendar surfaces: Month, Agenda, Day/Week scheduling workspaces, print sheets, and related chrome (view switcher, toolbars, print preview).

## Target (not certification)

This report states a **WCAG 2.2 AA target**. It does **not** claim certification, VPAT completeness, or third-party audit sign-off.

## Automated (this build)

| Check | Status |
|-------|--------|
| Accessible names on month/agenda/day-week event and day links | Implemented |
| Status text on print sheets (not color-only) | Implemented |
| `prefers-reduced-motion` in globals | Present |
| Skip link / landmarks on major panels | Partial (existing patterns retained) |
| Touch targets (≥44px) on primary chips | Targeted via `.touch-target` |
| Unit: print privacy policy | `tests/unit/calendar-print` via validator |

## Manual — pending human check

| Check | Tool | Status |
|-------|------|--------|
| Screen reader pass — desktop | **NVDA** | **Pending human check** |
| Screen reader pass — iOS/macOS | **VoiceOver** | **Pending human check** |
| Keyboard-only Day/Week/Agenda/Print | Keyboard | Pending human check |
| Contrast spot-check on status pills / dense grids | Visual | Pending human check |
| Mobile zoom / reflow on narrow phone | Device | Pending human check |

## Non-goals

- Full site WCAG audit beyond calendar operator surfaces
- Certification language in marketing or compliance filings from this document alone
