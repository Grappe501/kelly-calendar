import { describe, expect, it } from "vitest";
import {
  buildVolunteerOperationsHome,
  deriveStaffingConfidence,
} from "@/lib/missions/volunteer-operations";
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

describe("Volunteer Operations (Step 7.4)", () => {
  it("treats missing staffing plan as Unknown confidence, not zero capacity", () => {
    expect(
      deriveStaffingConfidence({
        staffingPlanDefined: false,
        assigned: 0,
        required: 0,
      }),
    ).toBe("UNKNOWN");
  });

  it("keeps available volunteers and bench as first-class Unknown", () => {
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      isNext: true,
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    const home = buildVolunteerOperationsHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      missions: [
        {
          mission,
          countyName: "Benton",
          staffAssignedCount: 1,
          staffRequiredCount: 3,
          volunteerLeadAssigned: false,
        },
      ],
    });

    expect(home.availableVolunteers.status).toBe("unknown");
    expect(home.availableVolunteers.value).toBeNull();
    expect(home.leadershipBench.status).toBe("unknown");
    expect(home.assignedToday.status).toBe("known");
    expect(home.assignedToday.value).toBe(1);
    expect(home.openPositions.value).toBe(2);
    expect(home.criticalVacancies.value).toBe(1);
    expect(home.executiveFeed.unassignedTrainedCanvassersStatus).toBe("unknown");
    expect(home.executiveFeed.briefingLine).toMatch(/understaffed/i);
    expect(home.fieldFeed.missions[0]?.staffingConfidence).toBe("LOW");
    expect(home.countyFeed[0]?.volunteerCapacity.status).toBe("known");
  });

  it("does not invent a volunteer pool when no roles are defined", () => {
    const mission = toMissionCard({
      event: event("evt_2"),
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    const home = buildVolunteerOperationsHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      missions: [
        {
          mission,
          countyName: "Pulaski",
          staffAssignedCount: 0,
          staffRequiredCount: 0,
        },
      ],
    });
    expect(home.countyFeed[0]?.coverage.status).toBe("unknown");
    expect(home.countyFeed[0]?.volunteerCapacity.status).toBe("unknown");
    expect(home.executiveFeed.briefingLine).toMatch(/Unknown/i);
  });
});
