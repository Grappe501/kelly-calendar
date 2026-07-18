# KCCC Limited Event Display Standard

## Structure

```text
[Calendar name]
[Event title]
[General location, when available]
[Start time]–[End time]
```

## Component

`SafeEventBlock` (`src/components/calendar/safe-event-block.tsx`)

Requirements:

- Calendar category always visible
- Safe title visible
- Location when authorized
- No click affordance when `canOpen` is false
- Text limited-access notice (not icon-only)
- Keyboard focusable; touch-friendly; reduced-motion compatible

## Busy-only variant

```text
Protected Personal Time
Unavailable
2:00 PM–3:30 PM
```

No location. Occupied time remains on the calendar.
