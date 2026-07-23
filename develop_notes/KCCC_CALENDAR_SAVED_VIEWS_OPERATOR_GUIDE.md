# Saved Views — Operator Guide (CC-07)

## What a saved view is

A named bookmark of **search/filter configuration** (not a frozen list of Events). When you open it, the system re-runs the query under **your** permissions.

## Visibility

| Mode | Who sees it |
|------|-------------|
| Private | You |
| Campaign shared | Campaign operators |
| Role restricted | Selected system roles |

There are no anonymous public views.

## Relative dates

If you save “Today” or “This week,” opening the view uses **today’s** campaign date — not the day you saved it.

## Sharing safety

Sharing a view shares **filters**, not access. Events you cannot see stay invisible.

## Stale views

If a view’s query schema is older than the current version, the system may show a migration/stale notice. Update the view to refresh it.

## Manage

`/system/calendar/saved-views` lists views you may see. Open one to jump into a compatible calendar layout.

## ICS export / subscriptions (CC-10)

Saved views can scope a private subscription feed. Manage feeds at `/system/calendar/subscriptions` (create / rotate / revoke) and one-time downloads at `/system/calendar/exports`. Feed URLs are secrets — see `KCCC_CALENDAR_SUBSCRIPTION_OPERATOR_GUIDE.md`.
