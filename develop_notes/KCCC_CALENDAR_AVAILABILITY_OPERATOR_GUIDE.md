# Calendar Availability — Operator Guide (CC-05)

## What this is for

Declare Kelly's standing schedule once (office hours, protected work,
travel/prep/recovery buffers, vacations, blackouts) so that creating or
moving an Event surfaces a warning instead of silently double-booking a
protected block. Nothing here moves, cancels, or auto-resolves an Event —
you always make the final call.

## First-time setup

1. Go to `/system/calendar/availability`.
2. Click **Seed standing policy rules** (only visible when there are zero
   rules). This creates the documented standing policy: Mon–Fri office
   hours (unavailable), lunch (preferred/open), Tuesday Little Rock
   default location (constrained), and a morning preparation buffer —
   already `ACTIVE`.
3. Add any additional rules from **New rule**. New rules start as `DRAFT`
   and do **not** affect evaluations until you **Approve** them from the
   rule's detail page.

## Adding a one-off exception

Use **Exceptions** for anything that isn't a recurring pattern: a single
vacation day, a one-time evening opening, a specific blackout date.
Exceptions are created directly `ACTIVE`. Cancel one from the same page
when it no longer applies — cancelling never deletes history.

## What operators see when creating/editing/rescheduling an Event

- If the proposed time is `AVAILABLE`/`PREFERRED`/`UNKNOWN` with no
  blocking findings, the save proceeds normally. If there's anything
  informational to know, it appears in a small **Standing availability**
  panel after saving.
- If the proposed time overlaps an `UNAVAILABLE` rule/exception, the save
  is **held** (HTTP 409) and the same panel appears with the finding(s),
  a checkbox ("I reviewed this and accept the risk of saving anyway"), and
  an optional reason field. Checking the box and clicking **Accept risk &
  retry save** re-submits the save with that acknowledgement attached —
  it is recorded in the audit trail and the Event still saves as you
  intended. The Event is **never** moved to a different time for you.

## Viewing the standing schedule

`/system/calendar/availability/preview` expands the active rules and
exceptions over a date range you choose (default: next 14 days) into a
plain, non-interactive list — classification is always shown as text
(e.g. `[UNAVAILABLE]`), not just a color, so it reads correctly for
screen readers and in plain-text exports.

## Who can do what

- **View** rules/exceptions/preview: any authenticated operator with
  calendar view access.
- **Create/edit rules, create/cancel exceptions, acknowledge findings**:
  Scheduler, Staff, Campaign Manager, or Kelly.
- **Approve a rule / seed the standing policy**: Campaign Manager or
  Kelly only.

## Things this build deliberately does not do

- It does not detect conflicts between two Events (that's the separately
  gated CC-06 Conflict Engine).
- It does not automatically reschedule, cancel, or confirm anything.
- It does not change Kelly's calendar anywhere outside this app.
