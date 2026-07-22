# Calendar Conflict Engine — Operator Guide (CC-06)

## What this is for

The conflict engine watches Kelly's schedule for four kinds of trouble —
double-booked time, standing-availability violations, compressed buffers,
and infeasible travel between two stops — and shows them to you with an
explanation and evidence. It **never** moves, cancels, or auto-resolves
anything. You always make the final call.

## Where you'll see conflicts

1. **Day / Week / Month / Today views** — a conflict indicator appears on
   affected Events using the same panel you already know from before this
   build; it now also includes standing-availability, buffer, and travel
   conflicts, not just double-bookings.
2. **Event sheet** (open any Event) — a **Conflicts (CC-06)** panel lists
   that Event's open persisted conflicts with action buttons, plus a
   read-only "live re-assessment" so you can see if anything changed since
   the last recompute.
3. **`/system/conflicts`** — the full operator queue: every open conflict
   across the calendar, filterable by status/severity/type, with the same
   actions.

## Taking action on a conflict

- **Acknowledge** — "I've seen this." Records who and when (with an
  optional note). The conflict **stays open** — acknowledging does **not**
  resolve it. Use this when you want a record that the conflict was
  reviewed but haven't decided what to do yet.
- **Accept risk** — "I'm proceeding anyway, on purpose." Requires a reason.
  Moves the conflict to `ACCEPTED_RISK` — it stays visible in the queue,
  it just no longer reads as a fresh, un-reviewed `OPEN` item. Restricted
  to Campaign Manager / Kelly.
- **Resolve** — "This is actually fine now." If the underlying facts truly
  changed (you moved the Event, adjusted the other Event, added travel
  time, etc.) and a fresh check confirms the conflict is no longer
  detected, you can resolve it with no reason required. If the engine
  still detects it, you'll need to type a reason — you're telling the
  system something it can't see on its own. Resolving does **not** ever
  happen automatically just because the Event date passed.
- **Not applicable** — "This doesn't matter in my context." Always
  requires a reason. Use this for a genuine false positive.

Every action is written to the audit trail with your name and the reason
you gave (if any).

## Recomputing

Conflicts recompute automatically shortly after you create, edit, or
reschedule an Event — you don't need to do anything. If you want to force
a fresh scan of everything happening today (for example, right before you
check the queue), click **Recompute today** on `/system/conflicts`.

Recompute never deletes a conflict's history. If a conflict is no longer
detected, it's marked **stale** in the queue (and hidden from the default
view) rather than removed — you can still find it with "Include stale" if
you need the record.

## Things this build deliberately does not do

- It does not move, cancel, confirm, archive, restore, or delete an Event.
- It does not change an Event's status, recurrence, or any standing
  availability rule.
- It does not create or modify a Mission, or touch Travel/Logistics/Field
  Ops/Staffing/Closeout/Launch.
- It does not invent a travel duration, distance, or route — if no travel
  time has been entered for an Event, travel conflicts simply don't fire
  for it (shown as unknown, not flagged).
- It does not write anything back to Google Calendar, iCal, or Mobilize.
- Treating a conflict as `ACKNOWLEDGED` never counts as resolving it.
