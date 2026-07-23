# KCCC Calendar — Mobile Usability Doctrine

```text
Program: CC-12 (ADR-100)
Status:  Binding for calendar operator surfaces
```

## Principles

1. **Phone is a first-class operator surface**, not a shrunk desktop.
2. **List before density** — Agenda list view must remain one tap from Day/Week toolbars.
3. **Touch targets ≥ 44px** for primary chips, nav, and print actions.
4. **Horizontal week columns may scroll**, but a **day selector** must exist on narrow screens so operators can jump without hunting.
5. **Print is optional but discoverable** from the calendar switcher (and lightly from health/subscriptions).
6. **Motion is optional** — honor `prefers-reduced-motion`.
7. **No push stack** in the PWA manifest for this program (`gcm_sender_id` / push forbidden).

## Out of scope

- Native offline sync apps
- Drag/resize mutation on mobile
- Public anonymous calendar shells
- Phase Two IC mobile action features

## Related

- Print doctrine: `KCCC_CALENDAR_PRINT_DOCTRINE.md`
- A11y target report: `KCCC_CALENDAR_ACCESSIBILITY_CONFORMANCE_REPORT.md`
- Human gate: `KCCC_POST_CC12_HUMAN_USABILITY_GATE.md`
