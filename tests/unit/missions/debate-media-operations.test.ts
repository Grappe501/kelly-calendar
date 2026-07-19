import { describe, expect, it } from "vitest";
import {
  buildDebateMediaOperationsHome,
  classifyPublicAppearance,
} from "@/lib/missions/debate-media-operations";
import type { CampaignBrief } from "@/lib/missions/campaign-brief";
import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import type { ComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import type { LogisticsOperationsHome } from "@/lib/missions/logistics-operations";
import { toMissionCard } from "@/lib/missions/mission-card";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

function event(title = "Televised Debate"): SafeEventProjection {
  return {
    eventId: "evt_debate",
    eventNumber: "KCCC-0002",
    primaryCalendar: { id: "cal_1", name: "Command", type: "COMMAND" },
    title,
    startsAt: "2026-07-19T20:00:00.000Z",
    endsAt: "2026-07-19T21:30:00.000Z",
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
  };
}

function briefFor(missionId: string): CampaignBrief {
  return {
    title: "TODAY’S CAMPAIGN BRIEF",
    date: "2026-07-19",
    timezone: "America/Chicago",
    lastUpdatedAt: "2026-07-19T12:00:00.000Z",
    completeness: "partial",
    missions: {
      total: 1,
      completed: 0,
      remaining: 1,
      inProgress: 0,
      needsAttention: 0,
    },
    nextMission: {
      missionId,
      title: "Televised Debate",
      whenLabel: "3:00 PM",
      whereLabel: "Little Rock, AR",
      statusLabel: "Upcoming",
      missionStatus: "UPCOMING",
      href: `/events/${missionId}`,
    },
    readiness: { ready: 0, needsAttention: 0, blocked: 0, unknown: 1 },
    topBlocker: null,
    requiredAction: null,
    travel: {
      missionsWithTravel: 0,
      knownDriveMinutes: null,
      knownDriveMinutesPartial: false,
      nextMissionDriveMinutes: null,
    },
    people: {
      staffingGapMissions: 0,
      unassignedRoles: 0,
      detail: null,
    },
    conflicts: {
      unresolvedCount: 0,
      criticalCount: 0,
      topConflict: null,
    },
    counties: { names: ["Pulaski"], unknownCountyMissions: 0 },
    followUp: { outstandingCount: 0, detail: null, href: null },
  };
}

describe("Debate & Media Operations (Phase 2.2)", () => {
  it("classifies debates and keeps question/rebuttal libraries Unknown", () => {
    expect(
      classifyPublicAppearance({
        title: "Televised Debate",
        hasSpeech: true,
        hasPressItem: true,
      }),
    ).toBe("DEBATE");

    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    const communications = {
      missionRows: [
        {
          missionId: mission.missionId,
          hasSpeech: true,
          hasPressItem: true,
          hasTalkingPoints: true,
          talkingPointsReady: false,
          messagingRisk: "HIGH",
          overdueCount: 1,
          planDefined: true,
        },
      ],
      executiveFeed: {
        messagingRisk: "HIGH",
        rapidResponseNeeded: 1,
        pressDeadlinesAtRisk: 1,
        mediaCommitments: 1,
        briefingLine: "Comms at risk.",
      },
    } as unknown as CommunicationsOperationsHome;

    const compliance = {
      missionRows: [
        {
          missionId: mission.missionId,
          triple: { complianceState: "NEEDS_ATTENTION" },
        },
      ],
    } as unknown as ComplianceOperationsHome;

    const logistics = {
      missionRows: [
        {
          missionId: mission.missionId,
          domains: { materials: "UNKNOWN" },
        },
      ],
    } as unknown as LogisticsOperationsHome;

    const home = buildDebateMediaOperationsHome({
      brief: briefFor(mission.missionId),
      missions: [mission],
      countiesByMission: [
        { missionId: mission.missionId, countyName: "Pulaski" },
      ],
      communications,
      compliance,
      logistics,
    });

    expect(home.doctrine).toContain("not a parallel communications system");
    expect(home.publicAppearancesToday).toBe(1);
    expect(home.mediaCalendar[0]?.kind).toBe("DEBATE");
    expect(home.unknowns.some((u) => u.fact.includes("Rebuttal"))).toBe(true);
    expect(home.unknowns.some((u) => u.fact.includes("Anticipated"))).toBe(
      true,
    );
    expect(home.candidateFeed.mediaConfidence).not.toBe("READY");
    expect(home.communicationsFeed.approvedMessagingStatus).toBe("unknown");
    expect(home.intelligenceFeed.recurringQuestionsStatus).toBe("unknown");
    expect(home.executiveFeed.briefingLine).toMatch(/Media confidence/i);
  });
});
