import { describe, expect, it } from "vitest";
import { deduplicateEvents } from "@/features/calendar-import/deduplicate-events";
import { expandSimpleRecurrence } from "@/features/calendar-import/expand-recurrence";
import { assertManifestSafe, createImportManifest } from "@/features/calendar-import/import-manifest";
import { normalizeParsedEvent } from "@/features/calendar-import/normalize-google-event";
import { parseIcalEvents } from "@/features/calendar-import/parse-ical";

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:evt-1@google.com
DTSTART:20251115T180000
DTEND:20251115T200000
SUMMARY:Benton County Fair
LOCATION:Rogers, AR
DESCRIPTION:Public appearance
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:evt-2@google.com
DTSTART;VALUE=DATE:20251201
DTEND;VALUE=DATE:20251202
SUMMARY:All day volunteer push
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:recur@google.com
DTSTART:20251110T090000
DTEND:20251110T100000
RRULE:FREQ=WEEKLY;COUNT=3
SUMMARY:Weekly call time
END:VEVENT
END:VCALENDAR`;

const range = {
  startsAt: "2025-11-01T00:00:00-05:00",
  endsAt: "2026-07-18T23:59:59-05:00",
  includeCancelled: false,
  includeAllDay: true,
  expandRecurring: true,
  importDescriptions: true,
  importLocations: true,
  importLinks: true,
};

describe("ICS parse / normalize / dedupe", () => {
  it("parses timed and all-day events", () => {
    const parsed = parseIcalEvents(SAMPLE_ICS);
    expect(parsed.length).toBe(3);
    expect(parsed[0].summary).toBe("Benton County Fair");
    expect(parsed[1].dtstartValueType).toBe("DATE");
  });

  it("normalizes into staged events inside the historical range", () => {
    const parsed = parseIcalEvents(SAMPLE_ICS);
    const staged = normalizeParsedEvent({
      event: parsed[0],
      sourceType: "PUBLIC_ICAL",
      sourceLabel: "Test",
      sourceFingerprint: "abc123",
      range,
      stagedEventId: "stg_1",
    });
    expect(staged).not.toBeNull();
    expect(staged!.basic.importedTitle).toBe("Benton County Fair");
    expect(staged!.proposedClassification.primaryCalendar).toBe("PUBLIC_EVENTS");
    expect(staged!.review.status).toBe("UNREVIEWED");
  });

  it("rejects events before the import floor via range filter", () => {
    const early = parseIcalEvents(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:old
DTSTART:20251001T120000
DTEND:20251001T130000
SUMMARY:Too early
END:VEVENT
END:VCALENDAR`);
    const staged = normalizeParsedEvent({
      event: early[0],
      sourceType: "PUBLIC_ICAL",
      sourceLabel: "Test",
      sourceFingerprint: "abc",
      range,
      stagedEventId: "stg_old",
    });
    expect(staged).toBeNull();
  });

  it("expands simple weekly recurrence within bounds", () => {
    const parsed = parseIcalEvents(SAMPLE_ICS);
    const master = parsed.find((e) => e.rrule)!;
    const instances = expandSimpleRecurrence(
      master,
      range.startsAt,
      "2025-11-30T23:59:59-06:00",
    );
    expect(instances.length).toBeGreaterThanOrEqual(2);
    expect(instances.length).toBeLessThanOrEqual(3);
  });

  it("marks exact duplicates by fingerprint / uid+start", () => {
    const parsed = parseIcalEvents(SAMPLE_ICS);
    const a = normalizeParsedEvent({
      event: parsed[0],
      sourceType: "PUBLIC_ICAL",
      sourceLabel: "Test",
      sourceFingerprint: "fp",
      range,
      stagedEventId: "stg_a",
    })!;
    const b = normalizeParsedEvent({
      event: parsed[0],
      sourceType: "PUBLIC_ICAL",
      sourceLabel: "Test",
      sourceFingerprint: "fp",
      range,
      stagedEventId: "stg_b",
    })!;
    const result = deduplicateEvents([b], [a]);
    expect(result[0].deduplication.status).toBe("EXACT_DUPLICATE");
  });

  it("keeps manifests free of source URLs", () => {
    const manifest = createImportManifest({
      sourceType: "PUBLIC_ICAL",
      sourceLabel: "Public calendar",
      sourceFingerprint: "deadbeefdeadbeef",
      startsAt: range.startsAt,
      endsAt: range.endsAt,
    });
    expect(() => assertManifestSafe(manifest)).not.toThrow();
    expect(JSON.stringify(manifest)).not.toMatch(/calendar\/ical\//i);
  });
});
