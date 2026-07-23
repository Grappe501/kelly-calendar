# Standard Event Activation Template

Code: `STANDARD_EVENT_ACTIVATION` · Version: `1.0.0`

Defined in `src/lib/missions/activation/templates.ts` (not hard-coded in UI).

Key timings (campaign-local):

| Step | Anchor | Offset |
|------|--------|--------|
| Setup tasks | ACTIVATION_APPLIED | 0h |
| Save-the-Date email prepare | ACTIVATION_APPLIED | +48h |
| Early briefs / RSVP verify | ACTIVATION_APPLIED | +24h |
| Week-before reminders / phone / digital | EVENT_START | −7d |
| Weekend canvass | WEEKEND_BEFORE_EVENT | 0 |
| Texting prepare | EVENT_START | −36h |
| Day-of | EVENT_START | −3…−1h |
| Outcome / hot wash | EVENT_END | +2…+4h |

External provider steps stay `WORK_REQUESTED` / draft — never auto-dispatch.
