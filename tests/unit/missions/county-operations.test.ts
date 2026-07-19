import { describe, expect, it } from "vitest";
import {
  buildCountyOperationsHome,
  countySlug,
  scoreCountyHealth,
} from "@/lib/missions/county-operations";
import { toMissionCard } from "@/lib/missions/mission-card";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

function event(id = "evt_1", overrides: Partial<SafeEventProjection> = {}): SafeEventProjection {
  return {
    eventId: id,
    eventNumber: "KCCC-0001",
    primaryCalendar: { id: "cal_1", name: "Command", type: "COMMAND" },
    title: "Town Hall",
    startsAt: "2026-07-19T15:00:00.000Z",
    endsAt: "2026-07-19T16:00:00.000Z",
    timezone: "America/Chicago",
    allDay: false,
    status: "IN_PROGRESS",
    location: { disclosure: "CITY", label: "Bentonville, AR" },
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

describe("County Operations (Step 7.3)", () => {
  it("slugifies county names", () => {
    expect(countySlug("Benton")).toBe("benton");
    expect(countySlug("St. Francis")).toBe("st-francis");
    expect(countySlug("Hot Spring")).toBe("hot-spring");
  });

  it("scores health with explainable factors totaling at most 100", () => {
    const scored = scoreCountyHealth({
      hasLeader: true,
      upcomingCount: 2,
      missionCountToday: 2,
      openNeedsCount: 0,
      readinessPercent: 90,
      checkedIn: 2,
      fieldHeat: "READY",
    });
    expect(scored.score).toBeLessThanOrEqual(100);
    expect(scored.factors).toHaveLength(6);
    expect(scored.explanation).toContain("Score");
  });

  it("groups all 75 counties and feeds executive weakness line", () => {
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      isNext: true,
      now: new Date("2026-07-19T12:00:00.000Z"),
      canMutateDayActions: true,
      eventVersion: 2,
    });

    const home = buildCountyOperationsHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
      missions: [
        {
          mission: {
            ...mission,
            ownerLabel: "Sarah",
            todayReadiness: {
              ...mission.todayReadiness,
              state: "BLOCKED",
              topIssue: "Materials missing",
            },
          },
          countyName: "Benton",
          staffAssignedCount: 0,
          staffRequiredCount: 3,
          readiness: {
            ...mission.todayReadiness,
            state: "BLOCKED",
            topIssue: "Materials missing",
          },
        },
      ],
      fieldHeat: [
        {
          countyName: "Benton",
          heat: "BLOCKED",
          missionCount: 1,
          needsAttentionCount: 0,
          blockedCount: 1,
        },
      ],
      fieldHelp: [
        {
          countyLabel: "Benton",
          detail: "Materials missing",
          severity: "CRITICAL",
        },
      ],
    });

    expect(home.totalCounties).toBe(75);
    expect(home.groups).toHaveLength(4);
    expect(home.groupCounts.NEEDS_IMMEDIATE_ATTENTION).toBeGreaterThanOrEqual(1);
    expect(home.executiveFeed.briefingLine.length).toBeGreaterThan(0);
    expect(home.executiveFeed.topWeak[0]?.countyName).toBe("Benton");

    const benton = home.groups
      .flatMap((g) => g.counties)
      .find((c) => c.slug === "benton");
    expect(benton?.leaderLabel).toBe("Sarah");
    expect(benton?.healthFactors.length).toBe(6);
    expect(benton?.volunteerCapacity.status).toBe("unknown");
  });
});
