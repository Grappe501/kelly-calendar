import { describe, expect, it } from "vitest";
import { emptyLeaveByHook } from "@/lib/missions/leave-by-contract";
import { toMissionCard } from "@/lib/missions/mission-card";
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

describe("Mission Cards (Step 6.2)", () => {
  it("reframes a safe event as a mission with next/where/why/owner/action", () => {
    const card = toMissionCard({
      event: baseEvent(),
      timezone: "America/Chicago",
      isNext: true,
    });

    expect(card.missionId).toBe("evt_1");
    expect(card.title).toBe("County HQ briefing");
    expect(card.whereLabel).toContain("Little Rock");
    expect(card.whyItMatters.toLowerCase()).toContain("mission");
    expect(card.ownerLabel).toBe("Command Calendar");
    expect(card.immediateAction.label.length).toBeGreaterThan(0);
    expect(card.immediateAction.href).toContain("evt_1");
    expect(card.isNext).toBe(true);
    expect(card.leaveBy.status).toBe("not_computed");
  });

  it("surfaces readiness and risk from OI readiness results", () => {
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
    });

    expect(card.readinessScore).toBe(42);
    expect(card.readinessLabel).toMatch(/At risk/i);
    expect(card.riskLevel).toBe("CRITICAL");
    expect(card.riskNote).toMatch(/driver/i);
    expect(card.immediateAction.label).toBe("Assign driver");
  });

  it("keeps Leave By as a clean 6.3 contract hook", () => {
    const hook = emptyLeaveByHook("not_computed");
    expect(hook.leaveByAt).toBeNull();
    expect(hook.driveMinutes).toBeNull();
    expect(hook.confidence).toBeNull();

    const card = toMissionCard({
      event: baseEvent(),
      timezone: "America/Chicago",
      leaveBy: hook,
    });
    expect(card.leaveBy.status).toBe("not_computed");
  });
});
