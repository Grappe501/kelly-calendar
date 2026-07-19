# Private Google Calendar iCal (env) integration

**Status:** Import-only foundation  
**Env key:** `KCCC_GOOGLE_CALENDAR_ICAL_URL`  
**Push to Google:** **not supported** over secret iCal  

## Security rules

- Treat the secret iCal address like a password.
- Never paste it into Cursor chat, source, markdown, GitHub, Netlify config committed to git, logs, or screenshots.
- Code reads only the environment variable.
- `.env.example` contains a blank placeholder only.
- Diagnostics may report `calendarFeedConfigured: yes/no` — never the URL.
- Import reports and staging manifests store fingerprints / redacted labels only.
- Browser forms must not accept or echo the secret URL for `PRIVATE_ICAL_ENV`.

## What you can pull

The private iCal feed can supply Google Calendar VEVENT fields such as:

- title / summary
- start / end (timed or all-day)
- timezone (when present)
- description
- location
- status (including cancelled when published in the feed)
- UID / recurrence rules (as exposed by Google’s ICS export)
- last-modified / sequence (when present)

KCCC then classifies, deduplicates, stages for operator review, and applies campaign visibility rules. Imported private details still follow KCCC ACL / Busy-only / location-disclosure rules after promotion.

## What you cannot do with iCal alone

| Capability | Secret iCal | Google Calendar API + OAuth |
|------------|-------------|-----------------------------|
| One-way import / preview / stage | Yes | Yes |
| Detect changes on re-fetch | Partially (re-import + fingerprint) | Yes (incremental sync) |
| Push / create / update events in Google | **No** | Yes (write scopes) |
| Revoke access without rotating a permanent URL | Weak (reset secret address) | Strong (revoke OAuth token) |

**Answer:** you can pull from the secret iCal feed into KCCC’s staging pipeline. You cannot push campaign events from KCCC back to Kelly’s Google Calendar using this feed. Push requires a future OAuth Calendar API integration.

## Operator setup

1. In Google Calendar → Integrate calendar → copy **Secret address in iCal format** (do not share it in chat).
2. Locally: set `KCCC_GOOGLE_CALENDAR_ICAL_URL=` in gitignored `.env.local`.
3. Netlify: set the same key in the site environment UI (not in committed `netlify.toml` values).
4. Open `/import/google-calendar`, choose **Private Google Calendar iCal (server env)**, Validate, then Preview / Stage.

## Commands

```bash
npm run import:preview:private-ical
```

Fails safely when the env var is absent.

## Reset if leaked

Google Calendar → Settings → Integrate calendar → Secret address in iCal format → Reset. Then update `.env.local` / Netlify with the new value only.
