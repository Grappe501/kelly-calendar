# KCCC Location Disclosure Standard

## Levels

| Level | Example |
| --- | --- |
| EXACT | Full address (authorized viewers only) |
| VENUE | Benton County Fairgrounds |
| CITY | Rogers, Arkansas (campaign default for limited) |
| COUNTY | Benton County |
| REGION | Northwest Arkansas |
| HIDDEN | No location label |

## Defaults

- Limited campaign viewers: **CITY**
- Public events: may use **VENUE**
- Travel: **CITY**
- Protected personal: **HIDDEN**

Exact private addresses, hotel rooms, medical facilities, and security-sensitive entrances must be generalized or hidden for limited viewers.

Implementation: `src/lib/calendar-security/location-disclosure.ts`
