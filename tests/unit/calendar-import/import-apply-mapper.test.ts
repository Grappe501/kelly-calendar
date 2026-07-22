import { describe, expect, it } from "vitest";
import {
  buildImportProvenanceSnapshot,
  eventAppearsManuallyRescheduled,
  IMPORT_APPLY_BUILD_ID,
  IMPORT_FIELD_PRECEDENCE,
  IMPORT_PROVENANCE_AUDIT_ACTIONS,
} from "@/lib/calendar/import-provenance";
import {
  calendarSlugForProposal,
  mapNormalizedPayloadToEventFields,
  mergeImportFieldsWithLocalPrecedence,
} from "@/lib/calendar/import-apply-mapper";

describe("import provenance contracts (CC-01 → CC-02)", () => {
  it("builds a versioned provenance snapshot with hard invariants", () => {
    const snap = buildImportProvenanceSnapshot({
      provider: "GOOGLE_CALENDAR",
      externalSourceId: "src_1",
      externalEventId: "g_1",
      iCalUid: "uid@google",
      fingerprint: "abc123",
      importRunId: "run_1",
      importRecordId: "rec_1",
      canonicalEventId: "evt_1",
      applyOutcome: "created",
    });
    expect(snap.schemaVersion).toBe(1);
    expect(snap.buildId).toBe(IMPORT_APPLY_BUILD_ID);
    expect(snap.historicalAttendanceConfirmed).toBe(false);
    expect(snap.missionMutated).toBe(false);
    expect(snap.externalCalendarMutated).toBe(false);
    expect(IMPORT_PROVENANCE_AUDIT_ACTIONS.APPROVE).toBe("IMPORT_RECORD_APPROVE");
  });

  it("detects manual reschedule from status history", () => {
    expect(
      eventAppearsManuallyRescheduled({
        statusHistoryReasons: ["Created", "Rescheduled by operator"],
      }),
    ).toBe(true);
    expect(
      eventAppearsManuallyRescheduled({
        statusHistoryReasons: ["Created from import approval (CC-01)"],
      }),
    ).toBe(false);
  });
});

describe("import apply mapper", () => {
  const payload = {
    sourceSystem: "GOOGLE_CALENDAR",
    sourceEventId: "google-evt-1",
    iCalUid: "uid-1",
    status: "confirmed",
    summary: "County Fair Visit",
    location: "Little Rock, AR",
    start: { dateTime: "2026-09-15T14:00:00-05:00", timeZone: "America/Chicago" },
    end: { dateTime: "2026-09-15T15:30:00-05:00", timeZone: "America/Chicago" },
  };

  it("maps Google normalized payload into Event create fields", () => {
    const fields = mapNormalizedPayloadToEventFields(payload, {
      fingerprint: "fp-test-001",
    });
    expect(fields.internalTitle).toBe("County Fair Visit");
    expect(fields.isImported).toBe(true);
    expect(fields.historicalAttendanceConfirmed).toBe(false);
    expect(fields.status).toBe("HOLD");
    expect(fields.proposedCalendarType).toBe("PUBLIC_EVENTS");
    expect(fields.privateNotes).toContain("[importFingerprint:fp-test-001]");
    expect(calendarSlugForProposal(fields.proposedCalendarType)).toBe("public-events");
  });

  it("maps cancelled source status to CANCELLED Event status", () => {
    const fields = mapNormalizedPayloadToEventFields({
      ...payload,
      status: "cancelled",
    });
    expect(fields.status).toBe("CANCELLED");
    expect(fields.sourceCancelled).toBe(true);
  });

  it("ADR-081: source timing applies only when never manually rescheduled", () => {
    const incoming = mapNormalizedPayloadToEventFields({
      ...payload,
      start: { dateTime: "2026-09-15T16:00:00-05:00", timeZone: "America/Chicago" },
      end: { dateTime: "2026-09-15T17:00:00-05:00", timeZone: "America/Chicago" },
    });

    const unprotected = mergeImportFieldsWithLocalPrecedence(
      {
        internalTitle: "Operator renamed title",
        campaignDisplayTitle: "Operator renamed title",
        privateNotes: "local notes",
        status: "HOLD",
        startsAt: new Date("2026-09-15T14:00:00-05:00"),
        endsAt: new Date("2026-09-15T15:30:00-05:00"),
        timezone: "America/Chicago",
        isAllDay: false,
        isImported: true,
        statusHistoryReasons: ["Created from import approval (CC-01)"],
      },
      incoming,
    );
    expect(unprotected.appliedSourceTiming).toBe(true);
    expect(unprotected.data.startsAt?.toISOString()).toBe(incoming.startsAt.toISOString());
    expect(unprotected.protectedLocalFields).toEqual([...IMPORT_FIELD_PRECEDENCE.localWins]);

    const protectedTiming = mergeImportFieldsWithLocalPrecedence(
      {
        internalTitle: "Operator renamed title",
        campaignDisplayTitle: "Operator renamed title",
        privateNotes: "local notes",
        status: "CONFIRMED",
        startsAt: new Date("2026-09-15T14:00:00-05:00"),
        endsAt: new Date("2026-09-15T15:30:00-05:00"),
        timezone: "America/Chicago",
        isAllDay: false,
        isImported: true,
        statusHistoryReasons: ["Created", "Rescheduled by Kelly"],
      },
      incoming,
    );
    expect(protectedTiming.appliedSourceTiming).toBe(false);
    expect(protectedTiming.data).toEqual({});
  });
});
