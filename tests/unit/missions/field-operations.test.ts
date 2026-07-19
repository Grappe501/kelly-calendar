import { describe, expect, it } from "vitest";
import {
  buildFieldOperationsHome,
  deriveFieldEscalation,
  fieldCheckInToDayAction,
} from "@/lib/missions/field-operations";
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
  };
}

describe("Field Operations (Step 7.2)", () => {
  it("maps check-ins to authenticated day actions", () => {
    expect(fieldCheckInToDayAction("ON_SITE")).toBe("MARK_ARRIVED");
    expect(fieldCheckInToDayAction("NEED_HELP")).toBe("NEEDS_ATTENTION");
    expect(fieldCheckInToDayAction("MISSION_COMPLETE")).toBe("MARK_COMPLETE");
  });

  it("escalates blocked + staff gap to campaign manager", () => {
    expect(
      deriveFieldEscalation({
        blocked: true,
        staffGap: true,
        readinessState: "BLOCKED",
        confirmationNeedsAttention: true,
      }),
    ).toBe("CAMPAIGN_MANAGER");
  });

  it("builds help queue and executive feed from missions", () => {
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      isNext: true,
      now: new Date("2026-07-19T12:00:00.000Z"),
      canMutateDayActions: true,
      eventVersion: 2,
    });
    // Force attention via confirmation + staffing gap inputs
    const home = buildFieldOperationsHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
      missions: [
        {
          mission: {
            ...mission,
            todayReadiness: {
              ...mission.todayReadiness,
              state: "BLOCKED",
              topIssue: "Materials missing",
            },
            confirmationStatus: "NEEDS_ATTENTION",
          },
          countyName: "Benton",
          staffAssignedCount: 0,
          staffRequiredCount: 2,
          readiness: {
            ...mission.todayReadiness,
            state: "BLOCKED",
          },
        },
      ],
    });

    expect(home.title).toBe("FIELD OPERATIONS");
    expect(home.activeMissions).toBe(1);
    expect(home.blocked).toBeGreaterThanOrEqual(1);
    expect(home.helpQueue[0]?.countyLabel).toBe("Benton");
    expect(home.executiveFeed.teamsNeedingAttention).toBeGreaterThanOrEqual(1);
    expect(home.executiveFeed.briefingLine).toMatch(/need attention|blocked|understaffed/i);
    expect(home.teamCards[0]?.ownership.owner).toBeTruthy();
    expect(home.teamCards[0]?.canCheckIn).toBe(true);
  });
});
