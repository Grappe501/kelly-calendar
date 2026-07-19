import { describe, expect, it } from "vitest";
import {
  buildConstituentOperationsHome,
  deriveEngagementReadiness,
} from "@/lib/missions/constituent-operations";
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

describe("Voter & Constituent Operations (Step 7.9)", () => {
  it("marks overdue follow-ups as OVERDUE engagement", () => {
    expect(
      deriveEngagementReadiness({
        followupCount: 2,
        followupOpenCount: 1,
        followupOverdueCount: 1,
        followupOwnerAssigned: true,
        meetVotersObjective: true,
        buildRelationshipsObjective: false,
        supportOrganizationObjective: false,
        reachTargetAudienceObjective: false,
        eventPeopleCount: 0,
        eventOrganizationCount: 0,
      }),
    ).toBe("OVERDUE");
  });

  it("keeps voter engagement and targets Unknown — not a CRM", () => {
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    const home = buildConstituentOperationsHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      missions: [
        {
          mission,
          countyName: "Benton",
          constituent: {
            followupCount: 1,
            followupOpenCount: 1,
            followupOverdueCount: 0,
            followupOwnerAssigned: false,
            meetVotersObjective: true,
            buildRelationshipsObjective: false,
            supportOrganizationObjective: false,
            reachTargetAudienceObjective: false,
            eventPeopleCount: 2,
            eventOrganizationCount: 1,
          },
        },
      ],
    });

    expect(home.targetConstituencies.status).toBe("unknown");
    expect(home.engagementMomentum.status).toBe("unknown");
    expect(home.missionRows[0]?.voterEngagementStatus.status).toBe("unknown");
    expect(home.missionRows[0]?.engagement).toBe("NEEDS_FOLLOW_UP");
    expect(home.executiveFeed.highPriorityFollowups).toBe(1);
    expect(home.communicationsFeed.issueResonance.status).toBe("unknown");
    expect(home.volunteerFeed.canvassingRelationships.status).toBe("unknown");
    expect(home.unknowns.some((u) => u.fact.includes("CRM") || u.fact.includes("Person"))).toBe(
      true,
    );
  });
});
