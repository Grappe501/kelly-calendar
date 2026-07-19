import { describe, expect, it } from "vitest";
import { buildCampaignBrief } from "@/lib/missions/campaign-brief";
import {
  buildDeterministicExecutiveBriefing,
  buildExecutiveCommand,
} from "@/lib/missions/executive-command";
import { toMissionCard } from "@/lib/missions/mission-card";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

function event(): SafeEventProjection {
  return {
    eventId: "evt_1",
    eventNumber: "KCCC-0001",
    primaryCalendar: { id: "cal_1", name: "Command", type: "COMMAND" },
    title: "Benton stop",
    startsAt: "2026-07-19T15:00:00.000Z",
    endsAt: "2026-07-19T16:00:00.000Z",
    timezone: "America/Chicago",
    allDay: false,
    status: "CONFIRMED",
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
  };
}

describe("Executive Command (Step 7.1)", () => {
  it("builds morning priorities, health, inbox unknown deadlines, and briefing", () => {
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      isNext: true,
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    const brief = buildCampaignBrief({
      date: "2026-07-19",
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
      allMissionsToday: [mission],
      nextMission: mission,
      todayReadiness: {
        missionCount: 1,
        readyCount: 0,
        needsAttentionCount: 1,
        blockedCount: 0,
        unknownCount: 0,
        topIssue: "Staffing incomplete",
        nextAction: {
          label: "Assign staff",
          href: "/calendar?event=evt_1",
          missionId: "evt_1",
        },
        missions: [],
      },
      conflicts: [],
      countiesByMission: [{ missionId: "evt_1", countyName: "Benton" }],
      staffingByMission: [
        { missionId: "evt_1", staffAssignedCount: 0, staffRequiredCount: 1 },
      ],
    });

    const command = buildExecutiveCommand({
      brief,
      missions: [mission],
      countiesByMission: [{ missionId: "evt_1", countyName: "Benton" }],
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    expect(command.title).toBe("EXECUTIVE COMMAND");
    expect(command.todaysCampaign.topPriorities[0]?.urgency).toBe("NOW");
    expect(command.campaignHealth.volunteersAssigned.status).toBe("unknown");
    expect(command.campaignHealth.countiesActive).toBe(1);
    expect(command.geographic.counties[0]?.countyName).toBe("Benton");
    expect(
      command.executiveInbox.some(
        (i) => i.category === "DEADLINE" && i.status === "unknown",
      ),
    ).toBe(true);
    expect(command.executiveBriefing.source).toBe("deterministic_v1");
    expect(buildDeterministicExecutiveBriefing(brief)).toMatch(/Next:/);
  });
});
