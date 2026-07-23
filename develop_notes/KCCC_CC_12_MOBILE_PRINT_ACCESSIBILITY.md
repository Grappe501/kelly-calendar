# CC-12 — Mobile Hardening, Print Day Sheets & Accessibility

```text
Build:         KCCC-CC-12-MOBILE-PRINT-ACCESSIBILITY-1.0
Authorization: ADR-100
Standing:      ADR-094
Migration:     NONE
Status:        COMPLETE
```

## Mission

Harden calendar operator surfaces for phones and print, and improve accessibility (keyboard, semantics, contrast-friendly text status) without changing Event/Mission mutation doctrine.

## Doctrine

- Presentation only — no Event create/update/delete from print service
- No `CalendarPrint*` Prisma models (projection over existing Events)
- Print privacy profiles never emit `streetAddress`, private notes, feed tokens, or contacts
- Status and critical state shown as **text**, not color alone
- Mobile: 44px touch targets, agenda list fallback, week day selector on narrow screens
- Respect `prefers-reduced-motion`
- Print routes remain authenticated (not on public-paths)
- Manifest remains free of push / `gcm_sender_id`

## Surfaces

| Kind | Path |
|------|------|
| Preview | `/system/calendar/print/preview` |
| Day sheet | `/system/calendar/print/day/[date]` |
| Week overview | `/system/calendar/print/week/[date]` |
| Agenda sheet | `/system/calendar/print/agenda` |
| Print chip | Calendar view switcher + health/subscriptions headers |
| Agenda fallback | Day/Week toolbar (`MobileAgendaFallbackLink`) |

## Print profiles

| Profile | Audience | Location |
|---------|----------|----------|
| `DAY_OPERATIONS_REDACTED` | Field ops | City/state only |
| `INTERNAL_DAY_DETAIL` | Elevated staff | Venue + city (still no street) |
| `WEEK_OVERVIEW` | Planning | Titles + city + status |

## Validator

```bash
npm run calendar:mobile-print-a11y:validate
```

## Ship posture

Flip `CC_12_STATUS` to `COMPLETE` only after validator green, docs present, and ship commit/deploy recorded. Human usability gate remains **PENDING** after technical closeout (`KCCC_POST_CC12_HUMAN_USABILITY_GATE.md`).
