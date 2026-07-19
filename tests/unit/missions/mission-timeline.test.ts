import { describe, expect, it } from "vitest";
import {
  computeMissionTimeline,
  DEFAULT_DRIVE_MINUTES,
  DEFAULT_LOCAL_BUFFER_MINUTES,
  DEFAULT_TRAVEL_BUFFER_MINUTES,
  leaveByFromTimeline,
} from "@/lib/missions/mission-timeline";

describe("Mission Timeline Engine (Step 6.3)", () => {
  it("computes leaveBy = start - (drive + buffer) for travel missions", () => {
    const startsAt = "2026-07-19T14:00:00.000Z";
    const timeline = computeMissionTimeline({
      missionId: "m1",
      startsAt,
      endsAt: "2026-07-19T15:00:00.000Z",
      travelRequired: true,
      estimatedDurationMinutes: 17,
      bufferMinutes: 6,
      now: new Date("2026-07-19T12:00:00.000Z"),
    });

    expect(timeline.status).toBe("computed");
    expect(timeline.driveMinutes).toBe(17);
    expect(timeline.bufferMinutes).toBe(6);
    expect(timeline.leaveByAt).toBe(
      new Date(new Date(startsAt).getTime() - (17 + 6) * 60000).toISOString(),
    );
    expect(timeline.confidence).toBe(92);
    expect(timeline.source).toBe("deterministic_v1");
  });

  it("uses local buffer defaults when travel is not required", () => {
    const startsAt = "2026-07-19T14:00:00.000Z";
    const timeline = computeMissionTimeline({
      missionId: "m2",
      startsAt,
      endsAt: "2026-07-19T15:00:00.000Z",
      travelRequired: false,
    });

    expect(timeline.driveMinutes).toBe(0);
    expect(timeline.bufferMinutes).toBe(DEFAULT_LOCAL_BUFFER_MINUTES);
    expect(timeline.leaveByAt).toBe(
      new Date(
        new Date(startsAt).getTime() - DEFAULT_LOCAL_BUFFER_MINUTES * 60000,
      ).toISOString(),
    );
  });

  it("applies default drive when travel required but duration missing", () => {
    const timeline = computeMissionTimeline({
      missionId: "m3",
      startsAt: "2026-07-19T14:00:00.000Z",
      endsAt: "2026-07-19T15:00:00.000Z",
      travelRequired: true,
    });
    expect(timeline.driveMinutes).toBe(DEFAULT_DRIVE_MINUTES);
    expect(timeline.bufferMinutes).toBe(DEFAULT_TRAVEL_BUFFER_MINUTES);
    expect(timeline.travelRisk).toMatch(/estimated/i);
  });

  it("projects leaveBy hook from timeline for Mission Cards", () => {
    const timeline = computeMissionTimeline({
      missionId: "m4",
      startsAt: "2026-07-19T14:00:00.000Z",
      endsAt: "2026-07-19T15:00:00.000Z",
      travelRequired: true,
      estimatedDurationMinutes: 20,
      bufferMinutes: 10,
    });
    const leaveBy = leaveByFromTimeline(timeline);
    expect(leaveBy.status).toBe("computed");
    expect(leaveBy.leaveByAt).toBe(timeline.leaveByAt);
    expect(leaveBy.driveMinutes).toBe(20);
  });
});
