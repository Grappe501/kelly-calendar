import { describe, expect, it } from "vitest";
import {
  buildFundraisingOperationsHome,
  classifyFundraisingEvent,
} from "@/lib/missions/fundraising-operations";
import type { CampaignBrief } from "@/lib/missions/campaign-brief";
import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import type { ComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import type { FinanceOperationsHome } from "@/lib/missions/finance-operations";
import type { LogisticsOperationsHome } from "@/lib/missions/logistics-operations";
import { toMissionCard } from "@/lib/missions/mission-card";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

function event(title = "Evening Fundraiser"): SafeEventProjection {
  return {
    eventId: "evt_fr",
    eventNumber: "KCCC-0003",
    primaryCalendar: { id: "cal_fr", name: "Fundraising", type: "FUNDRAISING" },
    title,
    startsAt: "2026-07-19T23:00:00.000Z",
    endsAt: "2026-07-20T01:00:00.000Z",
    timezone: "America/Chicago",
    allDay: false,
    status: "CONFIRMED",
    location: { disclosure: "CITY", label: "Fayetteville, AR" },
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
      canViewFundraising: true,
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
      title: "Evening Fundraiser",
      whenLabel: "6:00 PM",
      whereLabel: "Fayetteville, AR",
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
    counties: { names: ["Washington"], unknownCountyMissions: 0 },
    followUp: { outstandingCount: 0, detail: null, href: null },
  };
}

describe("Fundraising Operations (Phase 2.3)", () => {
  it("classifies fundraisers and keeps pipeline/cash Unknown — not Finance", () => {
    expect(
      classifyFundraisingEvent({
        title: "Evening Fundraiser",
        isFundraisingCalendar: true,
      }),
    ).toBe("FUNDRAISER");

    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    const finance = {
      missionRows: [
        {
          missionId: mission.missionId,
          isFundraising: true,
          financeLeadAssigned: false,
        },
      ],
      executiveFeed: {
        financialBlockers: 1,
        fundraisingMissions: 1,
        briefingLine: "Finance lead gaps.",
      },
    } as unknown as FinanceOperationsHome;

    const communications = {
      missionRows: [
        {
          missionId: mission.missionId,
          planDefined: true,
          talkingPointsReady: false,
          hasPressItem: false,
          messagingRisk: "WATCH",
          overdueCount: 0,
        },
      ],
    } as unknown as CommunicationsOperationsHome;

    const compliance = {
      missionRows: [
        {
          missionId: mission.missionId,
          triple: { complianceState: "UNKNOWN" },
        },
      ],
    } as unknown as ComplianceOperationsHome;

    const logistics = {
      missionRows: [
        {
          missionId: mission.missionId,
          missionReadiness: "READY",
        },
      ],
    } as unknown as LogisticsOperationsHome;

    const home = buildFundraisingOperationsHome({
      brief: briefFor(mission.missionId),
      missions: [mission],
      countiesByMission: [
        { missionId: mission.missionId, countyName: "Washington" },
      ],
      finance,
      communications,
      compliance,
      logistics,
    });

    expect(home.doctrine).toContain("Finance owns resource state");
    expect(home.upcomingEvents).toBe(1);
    expect(home.eventRows[0]?.kind).toBe("FUNDRAISER");
    expect(home.pipelineHealth.status).toBe("unknown");
    expect(home.campaignFundingOutlook.status).toBe("unknown");
    expect(home.criticalFollowups.status).toBe("unknown");
    expect(
      home.readinessDomains.find((d) => d.domain === "FinanceLead")?.state,
    ).toBe("BLOCKED");
    expect(home.fundraisingReadiness).toBe("BLOCKED");
    expect(home.executiveFeed.pipelineHealthStatus).toBe("unknown");
    expect(home.communicationsFeed.fundraisingMessagingStatus).toBe("unknown");
  });
});
