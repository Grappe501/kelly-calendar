# KCCC Calendar Visibility Doctrine

**Document ID:** KCCC-CALENDAR-VISIBILITY-DOCTRINE  
**Status:** Permanent product rule  
**Step:** KCCC-STEP-03-ENV-SECURITY (visibility layer)

## Core rule

When an event exists but the viewer lacks full permission, the calendar **must still display a visible time block**. Protected events never disappear.

## Default limited display (authenticated campaign users)

```text
[Primary calendar name]
[Safe event title]
[General location, when available and safe]
[Start]–[End]
```

Example:

```text
Fundraising
Women for Kelly Reception
Little Rock, Arkansas
5:30 PM–7:00 PM
```

## What remains hidden

Private notes, donor names/amounts, host phones, attendee lists, travel confirmations, hotel/room details, strategy notes, attachments, audit/approval history, and AI private recommendations.

These fields are **omitted server-side** in `SafeCalendarEventView`. Client-side CSS hiding is not a security boundary.

## Visibility levels

| Level | Delivers |
| --- | --- |
| FULL | Authorized fields for role/section |
| LIMITED / TITLE_LOCATION | Calendar name, safe title, general location, times, status |
| BUSY_WITH_CATEGORY | Calendar name, generic safe title, optional location, times |
| BUSY_ONLY | Occupied label + times (protected personal default) |
| PUBLIC | Approved public representation |
| HIDDEN_FROM_UNAUTHENTICATED | Not shown to anonymous users |

Default authenticated campaign visibility: **TITLE_LOCATION**.

## Resolution order

1. Authentication  
2. System role  
3. Team membership  
4. Calendar membership  
5. Calendar permission  
6. Event override  
7. Event-section permissions  
8. Sensitivity  
9. Location disclosure  
10. Build safe view  
11. Deliver only authorized fields  
12. Audit when required  

## Implementation

- Policy registry: `data/calendar_visibility_policy.json`
- Resolver: `src/lib/calendar-security/resolve-event-visibility.ts`
- Sanitizer: `src/lib/calendar-security/sanitize-event-for-viewer.ts`
- Demo page: `/system/visibility`
- Status API: `GET /api/system/visibility`

Live calendar data and real candidate schedules remain prohibited until Step 4+ protections exist.
