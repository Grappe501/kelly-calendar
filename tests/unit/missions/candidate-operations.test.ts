import { describe, expect, it } from "vitest";
import {
  buildCandidateOperationsHome,
  type CandidateOperationsHome,
} from "@/lib/missions/candidate-operations";
import type { CampaignBrief } from "@/lib/missions/campaign-brief";
import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import type { ComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import type { ConstituentOperationsHome } from "@/lib/missions/constituent-operations";
import type { CountyOperationsHome } from "@/lib/missions/county-operations";
import type { FieldOperationsHome } from "@/lib/missions/field-operations";
import type { FinanceOperationsHome } from "@/lib/missions/finance-operations";
import {
  buildLogisticsOperationsHome,
  type LogisticsOperationsHome,
} from "@/lib/missions/logistics-operations";
import type { VolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import { toMissionCard } from "@/lib/missions/mission-card";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

function event(id = "evt_1"): SafeEventProjection {
  return {
    eventId: id,
    eventNumber: "KCCC-0001",
    primaryCalendar: { id: "cal_1", name: "Command", type: "COMMAND" },
    title: "Town Hall",
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
      title: "Town Hall",
      whenLabel: "10:00 AM",
      whereLabel: "Bentonville, AR",
      statusLabel: "Upcoming",
      missionStatus: "UPCOMING",
      href: `/events/${missionId}`,
    },
    readiness: { ready: 0, needsAttention: 0, blocked: 0, unknown: 1 },
    topBlocker: null,
    requiredAction: null,
    travel: {
      missionsWithTravel: 1,
      knownDriveMinutes: 25,
      knownDriveMinutesPartial: false,
      nextMissionDriveMinutes: 25,
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
    counties: { names: ["Benton"], unknownCountyMissions: 0 },
    followUp: { outstandingCount: 0, detail: null, href: null },
  };
}

describe("Candidate Operations (Phase 2.1)", () => {
  it("blocks preparedness when travel is blocked; keeps Security/Personal Unknown", () => {
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    const logistics = buildLogisticsOperationsHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      missions: [
        {
          mission,
          countyName: "Benton",
          logistics: {
            travelRequired: true,
            hasDriver: false,
            hasVehicleDescription: false,
            departureAt: null,
            targetArrivalAt: null,
            estimatedDurationMinutes: null,
            bufferMinutes: null,
            estimatedDistanceMiles: null,
            rentalRequired: false,
            flightRequired: false,
            lodgingRequired: false,
            overnightStay: false,
            packingCount: 0,
            packingPackedCount: 0,
            packingLoadedCount: 0,
            packingDeliveredCount: 0,
            packingSignageCount: 0,
            packingSignagePackedCount: 0,
            packingLiteratureCount: 0,
            packingLiteraturePackedCount: 0,
            venueName: "Library",
            city: "Bentonville",
            hasStreetAddress: true,
            locationPresent: true,
          },
        },
      ],
    });

    const communications = {
      interviews: { status: "unknown", value: null, reason: "x" },
      todaysMessage: { status: "unknown", value: null, reason: "x" },
      missionRows: [],
      executiveFeed: {
        todaysMessageStatus: "unknown",
        mediaCommitments: 0,
        pressDeadlinesAtRisk: 0,
        speakingEvents: 0,
        rapidResponseNeeded: 0,
        messagingRisk: "UNKNOWN",
        topItems: [],
        briefingLine: "Comms quiet.",
      },
      fieldFeed: {
        missions: [],
        todaysTalkingPoints: { status: "unknown", value: null, reason: "x" },
      },
    } as unknown as CommunicationsOperationsHome;

    const compliance = {
      missionRows: [],
      executiveFeed: {
        complianceRisk: "LOW",
        highRiskCommitments: 0,
        overdueItems: 0,
        briefingLine: "Compliance clear.",
      },
    } as unknown as ComplianceOperationsHome;

    const constituents = {
      missionRows: [
        {
          missionId: mission.missionId,
          peopleLinked: 3,
          organizationsLinked: 1,
        },
      ],
      executiveFeed: {
        overdueFollowups: 0,
        highPriorityFollowups: 0,
        relationshipRisk: "LOW",
        briefingLine: "Relationships stable.",
      },
    } as unknown as ConstituentOperationsHome;

    const counties = {
      executiveFeed: {
        needsImmediate: 0,
        topWeak: [],
        briefingLine: "Counties stable.",
      },
    } as unknown as CountyOperationsHome;

    const field = {
      executiveFeed: {
        teamsNeedingAttention: 0,
        briefingLine: "Field clear.",
      },
    } as unknown as FieldOperationsHome;

    const finance = {
      executiveFeed: {
        financialBlockers: 0,
        briefingLine: "Finance clear.",
      },
    } as unknown as FinanceOperationsHome;

    const volunteers = {
      fieldFeed: {
        missions: [
          {
            missionId: mission.missionId,
            volunteerLeadAssigned: false,
          },
        ],
      },
    } as unknown as VolunteerOperationsHome;

    const home = buildCandidateOperationsHome({
      brief: briefFor(mission.missionId),
      missions: [mission],
      countiesByMission: [{ missionId: mission.missionId, countyName: "Benton" }],
      logistics: logistics as LogisticsOperationsHome,
      communications,
      compliance,
      constituents,
      counties,
      field,
      finance,
      volunteers,
    });

    expect(home.doctrine).toContain("orchestrates Phase 1");
    expect(home.candidateBrief.greeting).toBe("Good Morning Kelly");
    expect(home.readinessDomains.find((d) => d.domain === "Security")?.state).toBe(
      "UNKNOWN",
    );
    expect(home.readinessDomains.find((d) => d.domain === "Personal")?.state).toBe(
      "UNKNOWN",
    );
    expect(home.engagementBriefs[0]?.host.status).toBe("unknown");
    expect(home.engagementBriefs[0]?.knownSupporters.status).toBe("unknown");
    expect(home.readinessDomains.find((d) => d.domain === "Travel")?.state).toBe(
      "BLOCKED",
    );
    expect(home.preparednessScore).toBe("BLOCKED");
    expect(home.binder.assembledFrom.length).toBeGreaterThan(3);
    expect(home.executiveFeed.briefingLine).toMatch(/preparedness/i);
    expect(home.title).toBe("CANDIDATE OPERATIONS");
    const _typeCheck: CandidateOperationsHome = home;
    expect(_typeCheck.candidateInbox.length).toBeGreaterThan(0);
  });
});
