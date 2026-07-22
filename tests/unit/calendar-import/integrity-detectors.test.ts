import { describe, expect, it } from "vitest";
import { runAllIntegrityDetectors } from "@/lib/calendar/integrity/detectors";
import { stableIntegrityFindingKey } from "@/lib/calendar/integrity/normalize";
import type { IntegrityEventSnapshot } from "@/lib/calendar/integrity/detectors";

function event(
  partial: Partial<IntegrityEventSnapshot> & Pick<IntegrityEventSnapshot, "id" | "eventNumber" | "internalTitle">,
): IntegrityEventSnapshot {
  const start = partial.startsAt ?? new Date("2026-09-15T14:00:00-05:00");
  const end = partial.endsAt ?? new Date("2026-09-15T15:00:00-05:00");
  return {
    campaignDisplayTitle: partial.internalTitle,
    status: "HOLD",
    startsAt: start,
    endsAt: end,
    timezone: "America/Chicago",
    isAllDay: false,
    isImported: false,
    isRecurring: false,
    recurrenceSeriesId: null,
    recurrenceRule: null,
    originalOccurrenceAt: null,
    city: "Little Rock",
    streetAddress: null,
    privateNotes: null,
    sourceType: "MANUAL",
    primaryCalendarId: "cal1",
    primaryCalendarSlug: "public-events",
    archivedAt: null,
    createdAt: start,
    updatedAt: start,
    version: 1,
    membershipCalendarIds: ["cal1"],
    primaryMembershipCount: 1,
    statusHistory: [{ fromStatus: null, toStatus: "HOLD", reason: "Created" }],
    externalIdentityIds: [],
    importRecordIds: [],
    missionId: null,
    ...partial,
  };
}

describe("CC-02 integrity detectors", () => {
  it("detects exact duplicates and keeps keys stable", () => {
    const findings = runAllIntegrityDetectors({
      events: [
        event({ id: "a", eventNumber: "1", internalTitle: "Fair" }),
        event({ id: "b", eventNumber: "2", internalTitle: "Fair" }),
      ],
      identities: [],
      importRecords: [],
      importRuns: [],
    });
    const exact = findings.filter((f) => f.findingType === "EXACT_DUPLICATE_GROUP");
    expect(exact.length).toBeGreaterThanOrEqual(1);
    expect(stableIntegrityFindingKey("EXACT_DUPLICATE_GROUP", ["x"])).toBe(
      stableIntegrityFindingKey("EXACT_DUPLICATE_GROUP", ["x"]),
    );
  });

  it("does not mark same title on different days as exact", () => {
    const findings = runAllIntegrityDetectors({
      events: [
        event({ id: "a", eventNumber: "1", internalTitle: "Weekly Sync" }),
        event({
          id: "b",
          eventNumber: "2",
          internalTitle: "Weekly Sync",
          startsAt: new Date("2026-09-22T14:00:00-05:00"),
          endsAt: new Date("2026-09-22T15:00:00-05:00"),
        }),
      ],
      identities: [],
      importRecords: [],
      importRuns: [],
    });
    expect(findings.filter((f) => f.findingType === "EXACT_DUPLICATE_GROUP")).toHaveLength(0);
  });

  it("flags imported events without identity", () => {
    const findings = runAllIntegrityDetectors({
      events: [
        event({
          id: "imp",
          eventNumber: "3",
          internalTitle: "Imported",
          isImported: true,
          sourceType: "GOOGLE_CALENDAR",
        }),
      ],
      identities: [],
      importRecords: [],
      importRuns: [],
    });
    expect(
      findings.some((f) => f.findingType === "IMPORTED_WITHOUT_IDENTITY"),
    ).toBe(true);
  });

  it("flags end-before-start", () => {
    const findings = runAllIntegrityDetectors({
      events: [
        event({
          id: "bad",
          eventNumber: "4",
          internalTitle: "Broken",
          startsAt: new Date("2026-09-15T16:00:00-05:00"),
          endsAt: new Date("2026-09-15T15:00:00-05:00"),
        }),
      ],
      identities: [],
      importRecords: [],
      importRuns: [],
    });
    expect(findings.some((f) => f.findingType === "END_BEFORE_START")).toBe(true);
  });

  it("flags source-deleted local-active", () => {
    const findings = runAllIntegrityDetectors({
      events: [
        event({
          id: "live",
          eventNumber: "5",
          internalTitle: "Still live",
          isImported: true,
          status: "HOLD",
        }),
      ],
      identities: [
        {
          id: "id1",
          externalSourceId: "src",
          externalEventId: "g1",
          fingerprint: "fp",
          canonicalEventId: "live",
          deletedAt: new Date(),
          provider: "GOOGLE_CALENDAR",
        },
      ],
      importRecords: [],
      importRuns: [],
    });
    expect(
      findings.some((f) => f.findingType === "SOURCE_DELETED_LOCAL_ACTIVE"),
    ).toBe(true);
  });
});
