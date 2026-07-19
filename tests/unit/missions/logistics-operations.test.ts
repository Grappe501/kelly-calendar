import { describe, expect, it } from "vitest";
import {
  buildLogisticsOperationsHome,
  combineOperationalReadiness,
  deriveMaterialsDomain,
  deriveTravelDomain,
} from "@/lib/missions/logistics-operations";
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

describe("Logistics Operations (Step 7.6)", () => {
  it("uses minimum domain readiness — not an average", () => {
    expect(
      combineOperationalReadiness(["READY", "READY", "BLOCKED", "NOT_REQUIRED"]),
    ).toBe("BLOCKED");
    expect(combineOperationalReadiness(["READY", "NEEDS_ATTENTION"])).toBe(
      "NEEDS_ATTENTION",
    );
  });

  it("blocks travel when required but driver missing", () => {
    expect(
      deriveTravelDomain({
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
        venueName: null,
        city: null,
        hasStreetAddress: false,
        locationPresent: false,
      }),
    ).toBe("BLOCKED");
  });

  it("blocks materials when packing plan exists but nothing packed", () => {
    expect(
      deriveMaterialsDomain({
        travelRequired: false,
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
        packingCount: 4,
        packingPackedCount: 0,
        packingLoadedCount: 0,
        packingDeliveredCount: 0,
        packingSignageCount: 1,
        packingSignagePackedCount: 0,
        packingLiteratureCount: 2,
        packingLiteraturePackedCount: 0,
        venueName: "Hall",
        city: "Bentonville",
        hasStreetAddress: true,
        locationPresent: true,
      }),
    ).toBe("BLOCKED");
  });

  it("keeps vehicle fleet Unknown while reporting known blockers", () => {
    const mission = toMissionCard({
      event: event(),
      timezone: "America/Chicago",
      now: new Date("2026-07-19T12:00:00.000Z"),
    });
    const home = buildLogisticsOperationsHome({
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
            packingCount: 2,
            packingPackedCount: 0,
            packingLoadedCount: 0,
            packingDeliveredCount: 0,
            packingSignageCount: 0,
            packingSignagePackedCount: 0,
            packingLiteratureCount: 0,
            packingLiteraturePackedCount: 0,
            venueName: null,
            city: null,
            hasStreetAddress: false,
            locationPresent: false,
          },
        },
      ],
    });

    expect(home.vehicleStatus.status).toBe("unknown");
    expect(home.missionRows[0]?.missionReadiness).toBe("BLOCKED");
    expect(home.executiveFeed.logisticsBlockers).toBeGreaterThan(0);
    expect(home.fieldFeed.missions[0]?.assignedVehicle).toBe("UNKNOWN");
    expect(home.volunteerFeed.driverAssignmentsNeeded).toBe(1);
  });
});
