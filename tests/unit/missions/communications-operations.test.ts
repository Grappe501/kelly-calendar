import { describe, expect, it } from "vitest";
import {
  buildCommunicationsOperationsHome,
  deriveCommsReadinessLabel,
  deriveMessagingRisk,
} from "@/lib/missions/communications-operations";
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

describe("Communications Operations (Step 7.5)", () => {
  it("treats empty plan as NO_PLAN / Unknown risk, not ready", () => {
    expect(
      deriveCommsReadinessLabel({
        itemCount: 0,
        readyCount: 0,
        openCount: 0,
        overdueCount: 0,
        missingOwnerCount: 0,
        hasTalkingPoints: false,
        talkingPointsReady: false,
        hasPressItem: false,
        hasSpeech: false,
        hasRapidResponse: false,
        rapidResponseOpen: false,
        nextPublishAt: null,
        nextDraftDueAt: null,
      }),
    ).toBe("NO_PLAN");
    expect(
      deriveMessagingRisk({
        overdueCount: 0,
        rapidResponseOpen: false,
        openCount: 0,
        planDefined: false,
        missingOwnerCount: 0,
      }),
    ).toBe("UNKNOWN");
  });

  it("keeps today’s message Unknown while counting known deadlines", () => {
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    const home = buildCommunicationsOperationsHome({
      date: "2026-07-19",
      timezone: "America/Chicago",
      missions: [
        {
          mission,
          countyName: "Benton",
          comms: {
            itemCount: 2,
            readyCount: 0,
            openCount: 2,
            overdueCount: 1,
            missingOwnerCount: 1,
            hasTalkingPoints: true,
            talkingPointsReady: false,
            hasPressItem: true,
            hasSpeech: false,
            hasRapidResponse: true,
            rapidResponseOpen: true,
            nextPublishAt: "2026-07-19T14:00:00.000Z",
            nextDraftDueAt: null,
          },
        },
      ],
    });

    expect(home.todaysMessage.status).toBe("unknown");
    expect(home.mediaCommitments.value).toBe(1);
    expect(home.pressDeadlines.value).toBe(1);
    expect(home.rapidResponseNeeded.value).toBe(1);
    expect(home.executiveFeed.todaysMessageStatus).toBe("unknown");
    expect(home.fieldFeed.missions[0]?.handoutStatus).toBe("UNKNOWN");
    expect(home.volunteerFeed.currentCampaignMessage.status).toBe("unknown");
    expect(home.executiveFeed.briefingLine).toMatch(/rapid response/i);
  });
});
