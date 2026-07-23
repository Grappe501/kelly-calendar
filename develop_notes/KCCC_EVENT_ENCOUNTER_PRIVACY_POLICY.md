# Event Encounter Privacy Policy (IC-02A)

```text
Build: KCCC-IC-02A-EVENT-OUTCOME-HOT-WASH-1.0
Related: D20 consent / contact architecture (existing)
```

## Purpose

Allow operators to note people and organizations met at Events without
automatically creating campaign contacts, consent records, or communications.

## Hard rules

1. A **name alone does not create** a `Person`.
2. An encounter **does not establish** communication consent.
3. Attendance **does not establish** consent.
4. Mobilize signup **does not establish** consent (unchanged).
5. RedDirt presence **does not establish** consent; IC-02A never imports
   contact details from RedDirt.
6. **No name-only matching** to existing Person records.
7. Encounters are **never** added to communication audiences automatically.
8. Encounters **never** create volunteer assignments automatically.
9. Encounter details are **not published** externally (ICS excludes them).

## Intentional contact capture

If contact details are intentionally captured for campaign use, operators must
use the established D20 consent/contact workflow with explicit:

- source
- purpose
- channel
- consent status

Otherwise retain only the encounter note.

## Review as contact

`Review as contact` sets encounter `contactReviewStatus` to `AWAITING_REVIEW`
and audits the action. It does **not** silently convert the encounter into a
Person or consent record.

## Confidential entries

`CONFIDENTIAL` hot-wash / encounter content is redacted from broad boards and
reports unless a leadership-authorized confidential view is requested.
