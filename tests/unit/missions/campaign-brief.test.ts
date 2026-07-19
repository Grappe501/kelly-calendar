import { describe, expect, it } from "vitest";
import {
  buildCampaignBrief,
  campaignBriefForAdvisory,
} from "@/lib/missions/campaign-brief";
import { toMissionCard } from "@/lib/missions/mission-card";
import { computeMissionTimeline } from "@/lib/missions/mission-timeline";
import { buildMissionTodayReadiness, buildTodayReadinessSummary } from "@/lib/missions/today-readiness";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";
import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";

function event(overrides: Partial<SafeEventProjection> = {}): SafeEventProjection {
  return {
    eventId: "evt_1",
    eventNumber: "KCCC-0001",
    primaryCalendar: { id: "cal_1", name: "Command", type: "COMMAND" },
    title: "County stop",
    startsAt: "2026-07-19T15:00:00.000Z",
    endsAt: "2026-07-19T16:00:00.000Z",
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

describe("Campaign Brief (Step 6.6)", () => {
  it("builds a leadership hierarchy with progress and blocker", () => {
    const timeline = computeMissionTimeline({
      missionId: "evt_1",
      startsAt: "2026-07-19T15:00:00.000Z",
      endsAt: "2026-07-19T16:00:00.000Z",
      travelRequired: true,
      estimatedDurationMinutes: 22,
      bufferMinutes: 8,
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    const readinessResult = {
      eventId: "evt_1",
      calculatedAt: new Date().toISOString(),
      overallScore: 40,
      readinessLevel: "AT_RISK" as const,
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
          explanation: "Travel blocked",
          priority: "CRITICAL" as const,
          domain: "Travel",
          actionType: "ASSIGN",
          targetRoute: "/calendar?event=evt_1",
          canViewerAct: true,
        },
      ],
      eventVersion: 1,
      calculationVersion: "kccc-readiness-1.0",
    };
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      timeline,
      readiness: readinessResult,
      isNext: true,
      now: new Date("2026-07-19T12:00:00.000Z"),
      canMutateDayActions: false,
    });
    const todayReadiness = buildTodayReadinessSummary([
      buildMissionTodayReadiness({
        missionId: "evt_1",
        missionTitle: "County stop",
        readiness: readinessResult,
      }),
    ]);

    const conflict: OperationalConflict = {
      id: "c1",
      conflictType: "CANDIDATE_SCHEDULE_OVERLAP",
      severity: "WARNING",
      primaryEntity: { type: "event", id: "evt_1", label: "County stop" },
      explanation: "Tentative overlap",
      evidence: ["a"],
      suggestedResolutions: [
        { code: "REVIEW_TIMES", label: "Review", autonomous: false },
      ],
      automaticallyResolved: false,
    };

    const brief = buildCampaignBrief({
      date: "2026-07-19",
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
      allMissionsToday: [mission],
      nextMission: mission,
      todayReadiness,
      conflicts: [conflict],
      countiesByMission: [{ missionId: "evt_1", countyName: "Pulaski" }],
      staffingByMission: [
        { missionId: "evt_1", staffAssignedCount: 0, staffRequiredCount: 1 },
      ],
    });

    expect(brief.title).toBe("TODAY’S CAMPAIGN BRIEF");
    expect(brief.missions).toEqual({
      total: 1,
      completed: 0,
      remaining: 1,
      inProgress: 0,
      needsAttention: 1,
    });
    expect(brief.nextMission?.title).toBe("County stop");
    expect(brief.topBlocker?.message).toMatch(/driver|blocked|Travel/i);
    expect(brief.travel.nextMissionDriveMinutes).toBe(22);
    expect(brief.people.unassignedRoles).toBe(1);
    expect(brief.conflicts.unresolvedCount).toBe(1);
    expect(brief.counties.names).toEqual(["Pulaski"]);
    expect(brief.requiredAction?.label).toBeTruthy();

    const advisoryPayload = campaignBriefForAdvisory(brief);
    expect(advisoryPayload).not.toHaveProperty("protectedSectionsOmitted");
    expect(JSON.stringify(advisoryPayload)).not.toMatch(/private|note|pii/i);
  });

  it("marks empty-day completeness when no missions", () => {
    const brief = buildCampaignBrief({
      date: "2026-07-19",
      timezone: "America/Chicago",
      allMissionsToday: [],
      nextMission: null,
      todayReadiness: {
        missionCount: 0,
        readyCount: 0,
        needsAttentionCount: 0,
        blockedCount: 0,
        unknownCount: 0,
        topIssue: null,
        nextAction: null,
        missions: [],
      },
      conflicts: [],
      countiesByMission: [],
      staffingByMission: [],
    });
    expect(brief.completeness).toBe("empty_day");
    expect(brief.topBlocker).toBeNull();
  });
});
