import { describe, expect, it } from "vitest";
import {
  buildGotvOperationsHome,
  classifyGotvActivity,
} from "@/lib/missions/gotv-operations";
import type { CampaignBrief } from "@/lib/missions/campaign-brief";
import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import type { CountyOperationsHome } from "@/lib/missions/county-operations";
import type { FieldOperationsHome } from "@/lib/missions/field-operations";
import type { LogisticsOperationsHome } from "@/lib/missions/logistics-operations";
import type { VolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import { toMissionCard } from "@/lib/missions/mission-card";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

function event(title = "Saturday Canvass"): SafeEventProjection {
  return {
    eventId: "evt_gotv",
    eventNumber: "KCCC-0004",
    primaryCalendar: { id: "cal_1", name: "Field", type: "FIELD" },
    title,
    startsAt: "2026-07-19T15:00:00.000Z",
    endsAt: "2026-07-19T18:00:00.000Z",
    timezone: "America/Chicago",
    allDay: false,
    status: "CONFIRMED",
    location: { disclosure: "CITY", label: "Fort Smith, AR" },
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
      title: "Saturday Canvass",
      whenLabel: "10:00 AM",
      whereLabel: "Fort Smith, AR",
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
      staffingGapMissions: 1,
      unassignedRoles: 2,
      detail: "Staffing incomplete",
    },
    conflicts: {
      unresolvedCount: 0,
      criticalCount: 0,
      topConflict: null,
    },
    counties: { names: ["Sebastian"], unknownCountyMissions: 0 },
    followUp: { outstandingCount: 0, detail: null, href: null },
  };
}

describe("GOTV Operations (Phase 2.4)", () => {
  it("classifies canvass and keeps turf/voter-file Unknown — not a voter DB", () => {
    expect(classifyGotvActivity({ title: "Saturday Canvass" })).toBe("CANVASS");

    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    const counties = {
      executiveFeed: {
        needsImmediate: 1,
        topWeak: [
          {
            countyName: "Sebastian",
            healthScore: 20,
            reason: "weak",
            href: "/counties/sebastian",
          },
        ],
        briefingLine: "County pressure.",
      },
    } as unknown as CountyOperationsHome;

    const volunteers = {
      fieldFeed: {
        missions: [
          {
            missionId: mission.missionId,
            openRoles: 2,
            volunteerLeadAssigned: false,
            staffingPlanDefined: false,
          },
        ],
      },
      executiveFeed: {
        criticalVacancies: 1,
        briefingLine: "Vacancies.",
      },
    } as unknown as VolunteerOperationsHome;

    const communications = {
      missionRows: [],
      executiveFeed: {
        rapidResponseNeeded: 0,
        briefingLine: "Comms quiet.",
      },
    } as unknown as CommunicationsOperationsHome;

    const logistics = {
      missionRows: [
        {
          missionId: mission.missionId,
          missionReadiness: "NEEDS_ATTENTION",
        },
      ],
    } as unknown as LogisticsOperationsHome;

    const field = {
      executiveFeed: {
        teamsNeedingAttention: 1,
        blockedMissions: 0,
        briefingLine: "Field busy.",
      },
    } as unknown as FieldOperationsHome;

    const home = buildGotvOperationsHome({
      brief: briefFor(mission.missionId),
      missions: [mission],
      countiesByMission: [
        { missionId: mission.missionId, countyName: "Sebastian" },
      ],
      counties,
      volunteers,
      communications,
      logistics,
      field,
    });

    expect(home.doctrine).toContain("does not replicate");
    expect(home.todaysDeployment).toBe(1);
    expect(home.activityRows[0]?.kind).toBe("CANVASS");
    expect(home.coverageGaps.status).toBe("unknown");
    expect(home.electionTimeline.status).toBe("unknown");
    expect(
      home.readinessDomains.find((d) => d.domain === "TurfCoverage")?.state,
    ).toBe("UNKNOWN");
    expect(
      home.readinessDomains.find((d) => d.domain === "VolunteerDeployment")
        ?.state,
    ).toBe("BLOCKED");
    expect(home.gotvReadiness).toBe("BLOCKED");
    expect(home.countyFeed[0]?.countyName).toBe("Sebastian");
    expect(home.volunteerFeed.stagingLocations.status).toBe("unknown");
    expect(home.executiveFeed.coverageGapsStatus).toBe("unknown");
  });
});
