import { describe, expect, it } from "vitest";
import {
  compareLegacyEventToMission,
  MISSION_V21_SEED_SOURCES,
  projectEventToMission,
  projectLifecyclePhase,
  projectMissionStatus,
  validateCampaignMission,
} from "@/lib/missions/v21";

describe("V2.1 Event → Mission projection", () => {
  it("projects Cave City seed into a preparing/ready mission with criteria", () => {
    const source = MISSION_V21_SEED_SOURCES[0]!;
    const mission = projectEventToMission(source, {
      now: new Date("2026-07-20T12:00:00.000Z"),
    });

    expect(mission.attendTitle).toBe("Cave City Watermelon Festival");
    expect(mission.objective).toMatch(/Sharp County/i);
    expect(mission.successCriteria.length).toBeGreaterThanOrEqual(5);
    expect(mission.missionStatus).toBe("READY");
    expect(mission.lifecyclePhase).toBe("PREPARE");
    expect(mission.intelligence.county).toBe("Sharp");
    expect(mission.intelligence.expectedRoi).toBeNull();
    expect(mission.completeness.isDraftValid).toBe(true);
    expect(mission.completeness.hasObjective).toBe(true);

    const validation = validateCampaignMission(mission);
    expect(validation.ok).toBe(true);
  });

  it("turns incomplete events into valid draft missions (not failures)", () => {
    const source = MISSION_V21_SEED_SOURCES[1]!;
    const mission = projectEventToMission(source);
    const validation = validateCampaignMission(mission);

    expect(mission.missionStatus).toBe("DRAFT");
    expect(mission.objective).toBeNull();
    expect(mission.successCriteria).toEqual([]);
    expect(mission.completeness.isDraftValid).toBe(true);
    expect(mission.completeness.unknownFields).toContain("objective");
    expect(validation.ok).toBe(true);
    expect(validation.issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("does not invent ROI or silently reclassify event types", () => {
    const source = MISSION_V21_SEED_SOURCES[2]!;
    const mission = projectEventToMission(source);
    expect(mission.intelligence.eventType).toBe("Fundraiser");
    expect(mission.intelligence.expectedRoi).toBeNull();
    expect(mission.missionStatus).toBe("READY");
  });

  it("exposes an explicit legacy ↔ mission comparison map", () => {
    const comparison = compareLegacyEventToMission(MISSION_V21_SEED_SOURCES[0]!);
    expect(comparison.legacyEvent.eventId).toBe(
      "seed_evt_cave_city_watermelon",
    );
    expect(comparison.fieldMap.some((f) => f.missionField === "objective")).toBe(
      true,
    );
    expect(
      comparison.fieldMap.find((f) => f.missionField === "intelligence.expectedRoi")
        ?.status,
    ).toBe("UNKNOWN");
  });

  it("maps lifecycle phases deterministically", () => {
    expect(
      projectLifecyclePhase({
        eventStatus: "CONFIRMED",
        startsAt: "2026-07-24T15:00:00.000Z",
        endsAt: "2026-07-24T19:00:00.000Z",
        travelRequired: true,
        hasOutcome: false,
        followupCount: 0,
        now: new Date("2026-07-24T14:00:00.000Z"),
      }),
    ).toBe("TRAVEL");

    expect(
      projectLifecyclePhase({
        eventStatus: "CONFIRMED",
        startsAt: "2026-07-24T15:00:00.000Z",
        endsAt: "2026-07-24T19:00:00.000Z",
        travelRequired: false,
        hasOutcome: false,
        followupCount: 0,
        now: new Date("2026-07-24T16:00:00.000Z"),
      }),
    ).toBe("EXECUTE");

    expect(
      projectLifecyclePhase({
        eventStatus: "CONFIRMED",
        startsAt: "2026-07-24T15:00:00.000Z",
        endsAt: "2026-07-24T19:00:00.000Z",
        travelRequired: false,
        hasOutcome: false,
        followupCount: 0,
        now: new Date("2026-07-24T20:00:00.000Z"),
      }),
    ).toBe("DEBRIEF");
  });

  it("maps event statuses without inventing confirmation", () => {
    expect(projectMissionStatus("DRAFT", false, false)).toBe("DRAFT");
    expect(projectMissionStatus("CONFIRMED", true, true)).toBe("READY");
    expect(projectMissionStatus("CONFIRMED", true, false)).toBe("PREPARING");
    expect(projectMissionStatus("CANCELLED", true, true)).toBe("CANCELLED");
  });
});
