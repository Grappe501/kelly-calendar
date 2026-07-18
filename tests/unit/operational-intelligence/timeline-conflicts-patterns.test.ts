import { describe, expect, it } from "vitest";
import { generateEventTimeline } from "@/features/operational-intelligence/services/timeline-service";
import {
  assessTravelFeasibility,
  detectCandidateOverlaps,
  detectCommunicationsDeadlineConflict,
} from "@/features/operational-intelligence/services/conflict-service";
import {
  isEligibleHistoricalEvidence,
  rebuildDurationPatterns,
} from "@/features/operational-intelligence/services/historical-pattern-service";
import { summarizeCountyCoverage } from "@/features/operational-intelligence/services/county-coverage-service";
import { recommendFastEntryDefaults } from "@/features/operational-intelligence/services/fast-entry-recommendation-service";

describe("timeline", () => {
  it("future event produces milestones; late event accelerates", () => {
    const startsAt = new Date(Date.now() + 20 * 3600000);
    const timeline = generateEventTimeline({
      eventId: "e1",
      startsAt,
      asOf: new Date(),
    });
    expect(timeline.accelerated).toBe(true);
    expect(timeline.milestones.some((m) => m.status === "ACCELERATED" || m.status === "MISSED")).toBe(
      true,
    );
  });
});

describe("conflicts", () => {
  it("confirmed overlap is critical and never auto-resolves", () => {
    const conflicts = detectCandidateOverlaps([
      {
        id: "1",
        label: "A",
        startsAt: new Date("2026-08-01T10:00:00Z"),
        endsAt: new Date("2026-08-01T12:00:00Z"),
        status: "CONFIRMED",
      },
      {
        id: "2",
        label: "B",
        startsAt: new Date("2026-08-01T11:00:00Z"),
        endsAt: new Date("2026-08-01T13:00:00Z"),
        status: "CONFIRMED",
      },
    ]);
    expect(conflicts[0]?.severity).toBe("CRITICAL");
    expect(conflicts[0]?.automaticallyResolved).toBe(false);
  });

  it("travel impossibility is critical", () => {
    const result = assessTravelFeasibility({
      previousEnd: new Date("2026-08-01T10:00:00Z"),
      nextArrivalTarget: new Date("2026-08-01T10:20:00Z"),
      estimatedTravelMinutes: 120,
      bufferMinutes: 15,
    });
    expect(result.feasibility).toBe("IMPOSSIBLE");
    expect(result.conflict?.severity).toBe("CRITICAL");
  });

  it("communications deadline after event is surfaced", () => {
    const conflict = detectCommunicationsDeadlineConflict({
      eventId: "e",
      eventLabel: "Forum",
      eventStartsAt: new Date("2026-08-01T18:00:00Z"),
      publishAt: new Date("2026-08-01T20:00:00Z"),
    });
    expect(conflict?.severity).toBe("HIGH");
  });
});

describe("patterns and coverage", () => {
  it("excludes unreviewed imports from patterns", () => {
    expect(
      isEligibleHistoricalEvidence({
        id: "1",
        historicalReviewStatus: "UNREVIEWED",
      }),
    ).toBe(false);
    const patterns = rebuildDurationPatterns([
      {
        id: "1",
        eventType: "Festival",
        historicalReviewStatus: "APPROVED",
        durationMinutes: 120,
      },
      {
        id: "2",
        eventType: "Festival",
        historicalReviewStatus: "UNREVIEWED",
        durationMinutes: 999,
      },
    ]);
    expect(patterns[0]?.sampleSize).toBe(1);
    expect(patterns[0]?.confidence).toBeLessThan(0.5);
  });

  it("county coverage does not count unreviewed visits as confirmed", () => {
    const rows = summarizeCountyCoverage([
      {
        countyId: "c1",
        countyName: "Pulaski",
        startsAt: new Date("2025-12-01"),
        historicalReviewStatus: "UNREVIEWED",
        historicalAttendanceConfirmed: false,
        isUpcoming: false,
      },
    ]);
    expect(rows[0]?.historicalReviewed).toBe(0);
    expect(rows[0]?.status).toBe("NEEDS_ATTENTION");
  });

  it("fast entry returns suggestions without claiming save", () => {
    const result = recommendFastEntryDefaults({
      eventType: "Festival Appearance",
      city: "Little Rock",
      travelRequired: true,
    });
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.suggestedWorkflowId).toBeTruthy();
  });
});
