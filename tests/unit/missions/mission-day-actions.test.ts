import { describe, expect, it } from "vitest";
import {
  availableMissionDayActions,
  missionDayActionAllowed,
} from "@/lib/missions/mission-day-actions";

describe("Mission day actions (Step 6.5)", () => {
  it("offers Start / Complete / Needs attention for confirmed missions", () => {
    const actions = availableMissionDayActions({
      status: "CONFIRMED",
      arrivalAt: null,
      confirmationStatus: null,
    });
    expect(actions).toEqual([
      "START_MISSION",
      "MARK_ARRIVED",
      "MARK_COMPLETE",
      "NEEDS_ATTENTION",
    ]);
  });

  it("hides Start once in progress and keeps arrived/complete", () => {
    const actions = availableMissionDayActions({
      status: "IN_PROGRESS",
      arrivalAt: null,
      confirmationStatus: null,
    });
    expect(actions).toContain("MARK_ARRIVED");
    expect(actions).toContain("MARK_COMPLETE");
    expect(actions).not.toContain("START_MISSION");
  });

  it("hides Mark arrived after arrival is recorded", () => {
    const actions = availableMissionDayActions({
      status: "IN_PROGRESS",
      arrivalAt: "2026-07-18T15:00:00.000Z",
      confirmationStatus: null,
    });
    expect(actions).not.toContain("MARK_ARRIVED");
    expect(actions).toContain("MARK_COMPLETE");
  });

  it("returns no actions for terminal statuses", () => {
    expect(
      availableMissionDayActions({
        status: "COMPLETED",
        arrivalAt: null,
        confirmationStatus: null,
      }),
    ).toEqual([]);
  });

  it("treats repeated Start as idempotent allowed", () => {
    const allowed = missionDayActionAllowed("START_MISSION", {
      status: "IN_PROGRESS",
      arrivalAt: null,
      confirmationStatus: null,
    });
    expect(allowed.ok).toBe(true);
  });

  it("rejects Mark complete from draft", () => {
    const allowed = missionDayActionAllowed("MARK_COMPLETE", {
      status: "DRAFT",
      arrivalAt: null,
      confirmationStatus: null,
    });
    expect(allowed.ok).toBe(false);
  });
});
