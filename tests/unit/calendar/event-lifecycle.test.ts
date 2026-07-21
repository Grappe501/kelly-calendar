import { describe, expect, it } from "vitest";
import {
  canTransitionEventStatus,
  assertEventStatusTransition,
} from "@/lib/calendar/event-status-transitions";
import {
  chicagoWallTimeToUtc,
  durationPresetToMinutes,
} from "@/lib/calendar/event-wall-time";
import { chicagoDateKey } from "@/lib/calendar/chicago-date";

describe("event-status-transitions", () => {
  it("allows draft to confirmed and cancel", () => {
    expect(canTransitionEventStatus("DRAFT", "CONFIRMED")).toBe(true);
    expect(canTransitionEventStatus("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransitionEventStatus("COMPLETED", "CONFIRMED")).toBe(false);
  });

  it("throws on invalid transition", () => {
    expect(() => assertEventStatusTransition("ARCHIVED", "DRAFT")).toThrow();
  });
});

describe("event-wall-time", () => {
  it("maps Chicago wall time back to the same date key", () => {
    const d = chicagoWallTimeToUtc("2026-07-21", "09:30");
    expect(chicagoDateKey(d)).toBe("2026-07-21");
    expect(durationPresetToMinutes("1 hour")).toBe(60);
  });
});
