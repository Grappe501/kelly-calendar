# Calendar Time — Operator Guide (CC-03)

## Timed vs all-day

- **Timed:** start date/time, end date/time, timezone.
- **All-day:** start date and last inclusive end date; no clock times shown.

Switching between them asks for confirmation. Timed → all-day drops displayed clock times. All-day → timed requires you to enter times.

## Overnight Events

If an Event ends after midnight, set **end date** to the next day. The Event appears on both days with a “continues” / “ends” label. It is still one Event.

## Timezone

Default campaign zone is America/Chicago. You can set another IANA zone (e.g. America/New_York).

When changing timezone on an existing Event:

- **Keep same instant** (default): the real-world moment stays put; wall-clock labels update.
- **Keep wall-clock times:** 9:00 stays 9:00 in the new zone (instant shifts).

## Daylight saving

- Times that do not exist in spring (e.g. 2:30 AM on the spring-forward day) are rejected — fix the time.
- Times that occur twice in fall need an **earlier** or **later** choice.

## Imports

Imported all-day and timed Events keep source meaning. Missing timezone uses campaign default and records that on the Event notes for review.
