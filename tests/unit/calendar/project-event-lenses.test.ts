import { describe, expect, it } from "vitest";
import {
  projectFollowUpLens,
  projectPreparationLens,
  projectTravelLens,
  projectSecondaryLens,
} from "@/lib/calendar/project-event-lenses";
import type { OperatingEventRecord } from "@/server/services/event-service";

function baseEvent(partial: Record<string, unknown>): OperatingEventRecord {
  return {
    eventId: "e0",
    eventNumber: "E-0",
    title: "Event",
    startsAt: "2026-07-21T14:00:00.000Z",
    endsAt: "2026-07-21T15:00:00.000Z",
    timezone: "America/Chicago",
    allDay: false,
    status: "CONFIRMED",
    visibilityLevel: "INTERNAL",
    canOpen: true,
    capabilities: {
      canEdit: false,
      canArchive: false,
      canViewParticipants: true,
      canViewNotes: false,
      canViewFiles: false,
      canViewTravel: true,
      canViewCommunications: false,
      canViewFundraising: false,
    },
    protectedSectionsOmitted: [],
    primaryCalendar: {
      id: "cal-1",
      name: "Candidate",
      type: "CANDIDATE",
    },
    missionId: null,
    missionLifecyclePhase: null,
    missionStatus: null,
    travel: null,
    openFollowUps: [],
    openActions: [],
    people: [],
    packing: [],
    ...partial,
  } as OperatingEventRecord;
}

describe("project-event-lenses", () => {
  it("projects travel when travelRequired", () => {
    const events = [
      baseEvent({
        eventId: "e1",
        title: "County coffee",
        travel: {
          travelRequired: true,
          departureAt: "2026-07-21T13:00:00.000Z",
          targetArrivalAt: null,
          estimatedDurationMinutes: 30,
          bufferMinutes: 10,
        },
      }),
      baseEvent({ eventId: "e2", title: "Desk work" }),
    ];
    expect(projectTravelLens(events)).toHaveLength(1);
    expect(projectTravelLens(events)[0].eventId).toBe("e1");
  });

  it("projects preparation from PRE_EVENT actions", () => {
    const events = [
      baseEvent({
        eventId: "e1",
        title: "Coffee",
        openActions: [
          {
            id: "a1",
            title: "Talking points",
            phase: "PRE_EVENT",
            status: "IN_PROGRESS",
            dueAt: null,
          },
        ],
      }),
    ];
    expect(projectPreparationLens(events)[0].summary).toContain("Talking points");
  });

  it("projects follow-up from open followups", () => {
    const events = [
      baseEvent({
        eventId: "e1",
        title: "Coffee",
        openFollowUps: [
          { id: "f1", title: "Send thank-you", status: "OPEN", dueAt: null },
        ],
      }),
    ];
    expect(projectFollowUpLens(events)[0].summary).toContain("thank-you");
  });

  it("routes secondary lens ids", () => {
    const events = [
      baseEvent({
        eventId: "e1",
        title: "Rally",
        people: ["Mayor"],
        travel: {
          travelRequired: true,
          departureAt: null,
          targetArrivalAt: null,
          estimatedDurationMinutes: null,
          bufferMinutes: null,
        },
      }),
    ];
    expect(projectSecondaryLens("people", events)[0].title).toBe("Mayor");
    expect(projectSecondaryLens("travel", events)).toHaveLength(1);
  });
});
