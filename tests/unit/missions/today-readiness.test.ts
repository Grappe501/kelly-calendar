import { describe, expect, it } from "vitest";
import type { EventReadinessResult } from "@/features/operational-intelligence/types/readiness-types";
import {
  buildMissionTodayReadiness,
  buildTodayReadinessSummary,
} from "@/lib/missions/today-readiness";

function readiness(partial: Partial<EventReadinessResult>): EventReadinessResult {
  return {
    eventId: "evt_1",
    calculatedAt: new Date().toISOString(),
    overallScore: 80,
    readinessLevel: "IN_PROGRESS",
    domains: [],
    criticalBlockers: [],
    nextBestActions: [],
    eventVersion: 1,
    calculationVersion: "kccc-readiness-1.0",
    ...partial,
  };
}

describe("Today’s Readiness (Step 6.4)", () => {
  it("marks missing OI snapshot as Unknown — never silent Ready", () => {
    const mission = buildMissionTodayReadiness({
      missionId: "evt_x",
      missionTitle: "Town hall",
      readiness: null,
    });
    expect(mission.state).toBe("UNKNOWN");
    expect(mission.categories.every((c) => c.state === "UNKNOWN")).toBe(true);
  });

  it("maps critical travel blocker to Blocked + priority action", () => {
    const mission = buildMissionTodayReadiness({
      missionId: "evt_1",
      missionTitle: "County HQ",
      readiness: readiness({
        readinessLevel: "AT_RISK",
        overallScore: 40,
        domains: [
          {
            domain: "Travel",
            score: 0,
            weight: 10,
            status: "INCOMPLETE",
            completedItems: 0,
            requiredItems: 1,
            blockers: [
              {
                code: "MISSING_DRIVER",
                domain: "Travel",
                message: "Travel required but no driver assigned",
                critical: true,
              },
            ],
            warnings: [],
          },
          {
            domain: "Date and Time",
            score: 100,
            weight: 7,
            status: "COMPLETE",
            completedItems: 2,
            requiredItems: 2,
            blockers: [],
            warnings: [],
          },
        ],
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
            explanation: "Critical blocker in Travel",
            priority: "CRITICAL",
            domain: "Travel",
            actionType: "MISSING_DRIVER",
            canViewerAct: true,
          },
        ],
      }),
    });

    expect(mission.state).toBe("BLOCKED");
    expect(mission.categories.find((c) => c.category === "Travel")?.state).toBe(
      "BLOCKED",
    );
    expect(mission.topIssue).toMatch(/driver/i);
    expect(mission.correctiveAction?.label).toBe("Assign driver");
  });

  it("summarizes Today with highest-priority blocker first", () => {
    const ready = buildMissionTodayReadiness({
      missionId: "a",
      missionTitle: "Ready mission",
      readiness: readiness({
        readinessLevel: "READY",
        overallScore: 95,
        domains: [
          {
            domain: "Date and Time",
            score: 100,
            weight: 7,
            status: "COMPLETE",
            completedItems: 2,
            requiredItems: 2,
            blockers: [],
            warnings: [],
          },
          {
            domain: "Location",
            score: 100,
            weight: 7,
            status: "COMPLETE",
            completedItems: 1,
            requiredItems: 1,
            blockers: [],
            warnings: [],
          },
        ],
      }),
    });

    const blocked = buildMissionTodayReadiness({
      missionId: "b",
      missionTitle: "Blocked mission",
      readiness: readiness({
        readinessLevel: "AT_RISK",
        domains: [
          {
            domain: "Staffing",
            score: 0,
            weight: 10,
            status: "INCOMPLETE",
            completedItems: 0,
            requiredItems: 1,
            blockers: [
              {
                code: "UNASSIGNED",
                domain: "Staffing",
                message: "Volunteer lead not assigned",
                critical: true,
              },
            ],
            warnings: [],
          },
        ],
        criticalBlockers: [
          {
            code: "UNASSIGNED",
            domain: "Staffing",
            message: "Volunteer lead not assigned",
            critical: true,
          },
        ],
        nextBestActions: [
          {
            id: "nba_staff",
            eventId: "b",
            title: "Assign owner",
            explanation: "Staffing blocked",
            priority: "CRITICAL",
            domain: "Staffing",
            actionType: "ASSIGN_STAFF",
            canViewerAct: true,
          },
        ],
      }),
    });

    const summary = buildTodayReadinessSummary([ready, blocked]);
    expect(summary.missionCount).toBe(2);
    expect(summary.blockedCount).toBe(1);
    expect(summary.topIssue).toMatch(/Volunteer lead/i);
    expect(summary.nextAction?.label).toBe("Assign owner");
    expect(summary.missions[0]?.missionId).toBe("b");
  });

  it("does not treat NOT_REQUIRED domains as Ready", () => {
    const mission = buildMissionTodayReadiness({
      missionId: "evt_2",
      missionTitle: "Internal",
      readiness: readiness({
        domains: [
          {
            domain: "Travel",
            score: 100,
            weight: 10,
            status: "NOT_REQUIRED",
            completedItems: 0,
            requiredItems: 0,
            blockers: [],
            warnings: [],
          },
          {
            domain: "Date and Time",
            score: 100,
            weight: 7,
            status: "COMPLETE",
            completedItems: 2,
            requiredItems: 2,
            blockers: [],
            warnings: [],
          },
        ],
      }),
    });
    expect(mission.categories.find((c) => c.category === "Travel")?.state).toBe(
      "UNKNOWN",
    );
    expect(mission.categories.find((c) => c.category === "Schedule")?.state).toBe(
      "READY",
    );
  });
});
