import { describe, expect, it } from "vitest";
import {
  buildFinanceOperationsHome,
  deriveResourceState,
  hasCostBearingTravel,
} from "@/lib/missions/finance-operations";
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

describe("Finance & Resources Operations (Step 7.7)", () => {
  it("blocks fundraising missions without a finance lead", () => {
    expect(
      deriveResourceState({
        isFundraisingCalendar: true,
        financeLeadAssigned: false,
        complianceLeadAssigned: false,
        rentalRequired: false,
        flightRequired: false,
        lodgingRequired: false,
        overnightStay: false,
        estimatedDistanceMiles: null,
        packingCount: 0,
      }),
    ).toBe("BLOCKED");
  });

  it("flags cost-bearing travel without finance lead as NEEDS_ATTENTION", () => {
    const snap = {
      isFundraisingCalendar: false,
      financeLeadAssigned: false,
      complianceLeadAssigned: false,
      rentalRequired: true,
      flightRequired: false,
      lodgingRequired: false,
      overnightStay: false,
      estimatedDistanceMiles: 40,
      packingCount: 0,
    };
    expect(hasCostBearingTravel(snap)).toBe(true);
    expect(deriveResourceState(snap)).toBe("NEEDS_ATTENTION");
  });

  it("keeps cash/budget Unknown and preserves dual operational vs resource state", () => {
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    const home = buildFinanceOperationsHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      missions: [
        {
          mission,
          countyName: "Benton",
          operationalState: "READY",
          finance: {
            isFundraisingCalendar: true,
            financeLeadAssigned: false,
            complianceLeadAssigned: false,
            rentalRequired: false,
            flightRequired: false,
            lodgingRequired: false,
            overnightStay: false,
            estimatedDistanceMiles: null,
            packingCount: 0,
          },
        },
      ],
    });

    expect(home.cashPosition.status).toBe("unknown");
    expect(home.budgetRisk.status).toBe("unknown");
    expect(home.pendingApprovals.status).toBe("unknown");
    expect(home.missionRows[0]?.dual.operationalState).toBe("READY");
    expect(home.missionRows[0]?.dual.resourceState).toBe("BLOCKED");
    expect(home.executiveFeed.financialBlockers).toBe(1);
    expect(home.logisticsFeed.approvedTravelBudget.status).toBe("unknown");
    expect(home.volunteerFeed.mileageReimbursement.status).toBe("unknown");
    expect(home.communicationsFeed.literatureBudget.status).toBe("unknown");
  });
});
