import { describe, expect, it } from "vitest";
import { emptyLeaveByHook } from "@/lib/missions/leave-by-contract";
import { toMissionCard } from "@/lib/missions/mission-card";
import { computeMissionTimeline } from "@/lib/missions/mission-timeline";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";
import type { EventReadinessResult } from "@/features/operational-intelligence/types/readiness-types";

function baseEvent(overrides: Partial<SafeEventProjection> = {}): SafeEventProjection {
  return {
    eventId: "evt_1",
    eventNumber: "KCCC-0001",
    primaryCalendar: { id: "cal_1", name: "Command Calendar", type: "COMMAND" },
    title: "County HQ briefing",
    startsAt: "2026-07-19T14:00:00.000Z",
    endsAt: "2026-07-19T15:00:00.000Z",
    timezone: "America/Chicago",
    allDay: false,
    status: "CONFIRMED",
    location: { disclosure: "CITY", label: "Little Rock, AR" },
    visibilityLevel: "FULL",
    canOpen: true,
    capabilities: {
      canEdit: true,
      canArchive: true,
      canViewParticipants: true,
      canViewNotes: true,
      canViewFiles: true,
      canViewTravel: true,
      canViewCommunications: true,
      canViewFundraising: false,
    },
    protectedSectionsOmitted: [],
    ...overrides,
  };
}

describe("Mission Cards (Step 6.2/6.3)", () => {
  it("reframes a safe event as a mission with status + timeline leaveBy", () => {
    const timeline = computeMissionTimeline({
      missionId: "evt_1",
      startsAt: "2026-07-19T14:00:00.000Z",
      endsAt: "2026-07-19T15:00:00.000Z",
      travelRequired: true,
      estimatedDurationMinutes: 17,
      bufferMinutes: 6,
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    const card = toMissionCard({
      event: baseEvent(),
      timezone: "America/Chicago",
      isNext: true,
      timeline,
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    expect(card.missionId).toBe("evt_1");
    expect(card.missionStatus).toBe("PENDING");
    expect(card.missionStatusPresentation.symbol).toBe("○");
    expect(card.leaveBy.status).toBe("computed");
    expect(card.timeline?.driveMinutes).toBe(17);
    expect(card.todayReadiness.state).toBe("UNKNOWN");
    expect(card.immediateAction.label.length).toBeGreaterThan(0);
    expect(card.immediateAction.available).toBe(true);
    expect(card.immediateAction.href).toContain("/calendar?");
    expect(card.immediateAction.href).toContain("event=evt_1");
    expect(card.immediateAction.href).toContain("view=day");
    expect(card.immediateAction.href).toMatch(/date=\d{4}-\d{2}-\d{2}/);
    expect(card.availableDayActions).toEqual([]);
    expect(card.canMutateDayActions).toBe(false);
  });

  it("disables Open mission when viewer cannot open the event", () => {
    const card = toMissionCard({
      event: baseEvent({ canOpen: false, visibilityLevel: "BUSY_ONLY", title: "Unavailable" }),
      timezone: "America/Chicago",
    });
    expect(card.immediateAction.available).toBe(false);
    expect(card.immediateAction.href).toBe("");
    expect(card.immediateAction.unavailableReason).toMatch(/unavailable/i);
  });

  it("disables Open mission for cancelled events", () => {
    const card = toMissionCard({
      event: baseEvent({ status: "CANCELLED" }),
      timezone: "America/Chicago",
    });
    expect(card.immediateAction.available).toBe(false);
    expect(card.immediateAction.unavailableReason).toMatch(/cancelled/i);
  });

  it("exposes one-tap day actions when mutation is authorized", () => {
    const card = toMissionCard({
      event: baseEvent({ status: "CONFIRMED" }),
      timezone: "America/Chicago",
      eventVersion: 3,
      canMutateDayActions: true,
    });
    expect(card.eventVersion).toBe(3);
    expect(card.canMutateDayActions).toBe(true);
    expect(card.availableDayActions).toContain("START_MISSION");
    expect(card.availableDayActions).toContain("MARK_COMPLETE");
    expect(card.availableDayActions).toContain("NEEDS_ATTENTION");
  });

  it("marks needs attention from critical readiness blockers", () => {
    const readiness: EventReadinessResult = {
      eventId: "evt_1",
      calculatedAt: new Date().toISOString(),
      overallScore: 42,
      readinessLevel: "AT_RISK",
      domains: [],
      criticalBlockers: [
        {
          code: "MISSING_DRIVER",
          domain: "Travel",
          message: "Travel required but no driver assigned",
          critical: true,
        },
      ],
      nextBestActions: [
        {
          id: "nba_1",
          eventId: "evt_1",
          title: "Assign driver",
          explanation: "Travel cannot proceed without a driver.",
          priority: "CRITICAL",
          domain: "Travel",
          actionType: "ASSIGN",
          canViewerAct: true,
        },
      ],
      eventVersion: 1,
      calculationVersion: "kccc-readiness-1.0",
    };

    const card = toMissionCard({
      event: baseEvent({ status: "HOLD" }),
      timezone: "America/Chicago",
      readiness,
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    expect(card.missionStatus).toBe("NEEDS_ATTENTION");
    expect(card.riskLevel).toBe("CRITICAL");
    expect(card.immediateAction.label).toBe("Assign driver");
  });

  it("keeps empty leaveBy only when timeline is absent", () => {
    const card = toMissionCard({
      event: baseEvent(),
      timezone: "America/Chicago",
      leaveBy: emptyLeaveByHook("not_computed"),
    });
    expect(card.leaveBy.status).toBe("not_computed");
    expect(card.timeline).toBeNull();
  });
});
