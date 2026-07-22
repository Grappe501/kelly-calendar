import { describe, expect, it } from "vitest";
import {
  classifyBulkItem,
  buildBulkEventFingerprint,
  buildBulkPreviewFingerprint,
  inverseBulkAction,
  BULK_MAX_ITEMS,
} from "@/lib/calendar/bulk";

describe("CC-09 eligibility", () => {
  it("marks already archived as ALREADY_COMPLETE for ARCHIVE", () => {
    const result = classifyBulkItem({
      actionType: "ARCHIVE",
      status: "ARCHIVED",
      archivedAt: new Date(),
      isRecurring: false,
      recurrenceSeriesId: null,
      missionLinked: false,
      isImported: false,
      canAccess: true,
    });
    expect(result.eligibility).toBe("ALREADY_COMPLETE");
  });

  it("blocks cancel on archived", () => {
    const result = classifyBulkItem({
      actionType: "CANCEL",
      status: "ARCHIVED",
      archivedAt: new Date(),
      isRecurring: false,
      recurrenceSeriesId: null,
      missionLinked: true,
      isImported: false,
      canAccess: true,
    });
    expect(result.eligibility).toBe("INELIGIBLE");
  });

  it("never infers series from seriesScopeRequested", () => {
    const result = classifyBulkItem({
      actionType: "CANCEL",
      status: "CONFIRMED",
      archivedAt: null,
      isRecurring: true,
      recurrenceSeriesId: "s1",
      missionLinked: false,
      isImported: false,
      canAccess: true,
      seriesScopeRequested: true,
    });
    expect(result.eligibility).toBe("REQUIRES_INDIVIDUAL_REVIEW");
  });

  it("protects primary calendar removal", () => {
    const result = classifyBulkItem({
      actionType: "REMOVE_CALENDAR",
      status: "CONFIRMED",
      archivedAt: null,
      isRecurring: false,
      recurrenceSeriesId: null,
      missionLinked: false,
      isImported: false,
      canAccess: true,
      targetCalendarId: "cal1",
      isPrimaryCalendarTarget: true,
      alreadyMemberOfTarget: true,
    });
    expect(result.eligibility).toBe("INELIGIBLE");
  });

  it("denies unauthorized", () => {
    const result = classifyBulkItem({
      actionType: "ARCHIVE",
      status: "CONFIRMED",
      archivedAt: null,
      isRecurring: false,
      recurrenceSeriesId: null,
      missionLinked: false,
      isImported: false,
      canAccess: false,
    });
    expect(result.eligibility).toBe("UNAUTHORIZED");
  });
});

describe("CC-09 fingerprints", () => {
  it("is stable for identical inputs", () => {
    const a = buildBulkEventFingerprint({
      eventId: "e1",
      version: 2,
      status: "CONFIRMED",
      archivedAt: null,
      startsAt: "2026-08-01T15:00:00.000Z",
      endsAt: "2026-08-01T16:00:00.000Z",
      primaryCalendarId: "c1",
    });
    const b = buildBulkEventFingerprint({
      eventId: "e1",
      version: 2,
      status: "CONFIRMED",
      archivedAt: null,
      startsAt: "2026-08-01T15:00:00.000Z",
      endsAt: "2026-08-01T16:00:00.000Z",
      primaryCalendarId: "c1",
    });
    expect(a).toBe(b);
    expect(a).not.toContain("Town");
  });

  it("changes when version changes", () => {
    const a = buildBulkEventFingerprint({
      eventId: "e1",
      version: 1,
      status: "CONFIRMED",
      archivedAt: null,
      startsAt: "2026-08-01T15:00:00.000Z",
      endsAt: "2026-08-01T16:00:00.000Z",
      primaryCalendarId: "c1",
    });
    const b = buildBulkEventFingerprint({
      eventId: "e1",
      version: 2,
      status: "CONFIRMED",
      archivedAt: null,
      startsAt: "2026-08-01T15:00:00.000Z",
      endsAt: "2026-08-01T16:00:00.000Z",
      primaryCalendarId: "c1",
    });
    expect(a).not.toBe(b);
  });

  it("builds preview fingerprint sorted", () => {
    const a = buildBulkPreviewFingerprint({
      actionType: "ARCHIVE",
      campaignKey: "kelly",
      eventFingerprints: ["b", "a"],
    });
    const b = buildBulkPreviewFingerprint({
      actionType: "ARCHIVE",
      campaignKey: "kelly",
      eventFingerprints: ["a", "b"],
    });
    expect(a).toBe(b);
  });
});

describe("CC-09 recovery inverses", () => {
  it("maps archive to restore", () => {
    expect(inverseBulkAction("ARCHIVE")).toBe("RESTORE");
    expect(inverseBulkAction("CANCEL")).toBeNull();
  });

  it("documents max batch size", () => {
    expect(BULK_MAX_ITEMS).toBe(50);
  });
});
