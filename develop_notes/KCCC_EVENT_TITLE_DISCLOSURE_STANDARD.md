# KCCC Event Title Disclosure Standard

## Fields

| Field | Audience |
| --- | --- |
| `internalTitle` | Full authorized viewers |
| `campaignDisplayTitle` | Authenticated campaign limited viewers |
| `restrictedDisplayTitle` | Busy-category / sensitive fallback |
| `publicTitle` | Public viewers |

## Resolution

- Full → `internalTitle`
- Limited campaign → `campaignDisplayTitle` → `restrictedDisplayTitle` → category fallback (never internal when sensitive)
- Busy only → `restrictedDisplayTitle` or `Unavailable`
- Public → `publicTitle` or safe public label

Sensitive examples:

- Internal: “Medical appointment with provider name” → Limited: “Protected Personal Time”
- Internal: “Dinner with named donors” → Limited: “Finance Committee Dinner”

Implementation: `src/lib/calendar-security/event-title-policy.ts`
