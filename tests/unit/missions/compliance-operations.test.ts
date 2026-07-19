import { describe, expect, it } from "vitest";
import {
  buildComplianceOperationsHome,
  deriveComplianceState,
} from "@/lib/missions/compliance-operations";
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

describe("Compliance Operations (Step 7.8)", () => {
  it("blocks required review without a compliance lead", () => {
    expect(
      deriveComplianceState({
        isComplianceCalendar: false,
        isFundraisingCalendar: false,
        complianceLeadAssigned: false,
        requiresComplianceReview: true,
        complianceActionCount: 0,
        complianceActionOpenCount: 0,
        complianceActionOverdueCount: 0,
        hasPressOrSpeechComms: false,
      }),
    ).toBe("BLOCKED");
  });

  it("blocks when compliance actions are overdue", () => {
    expect(
      deriveComplianceState({
        isComplianceCalendar: false,
        isFundraisingCalendar: false,
        complianceLeadAssigned: true,
        requiresComplianceReview: false,
        complianceActionCount: 2,
        complianceActionOpenCount: 1,
        complianceActionOverdueCount: 1,
        hasPressOrSpeechComms: false,
      }),
    ).toBe("BLOCKED");
  });

  it("keeps filings Unknown and uses minimum domain for mission status", () => {
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    const home = buildComplianceOperationsHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      missions: [
        {
          mission,
          countyName: "Benton",
          operationalState: "READY",
          resourceState: "READY",
          compliance: {
            isComplianceCalendar: false,
            isFundraisingCalendar: false,
            complianceLeadAssigned: false,
            requiresComplianceReview: true,
            complianceActionCount: 0,
            complianceActionOpenCount: 0,
            complianceActionOverdueCount: 0,
            hasPressOrSpeechComms: false,
          },
        },
      ],
    });

    expect(home.upcomingFilingDeadlines.status).toBe("unknown");
    expect(home.missionRows[0]?.triple.operationalState).toBe("READY");
    expect(home.missionRows[0]?.triple.resourceState).toBe("READY");
    expect(home.missionRows[0]?.triple.complianceState).toBe("BLOCKED");
    expect(home.missionRows[0]?.triple.missionStatus).toBe("BLOCKED");
    expect(home.executiveFeed.highRiskCommitments).toBe(1);
    expect(home.financeFeed.reportingReadiness.status).toBe("unknown");
    expect(home.communicationsFeed.disclaimerReadiness.status).toBe("unknown");
    expect(home.fieldFeed.missions[0]?.petitionCompliance.status).toBe("unknown");
  });
});
