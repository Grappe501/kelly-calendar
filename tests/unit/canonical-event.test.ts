import { describe, expect, it } from "vitest";
import {
  CANONICAL_EVENT_MODEL,
  FORBIDDEN_COMPETING_EVENT_MODEL_NAMES,
  assertNoCompetingEventModelName,
  deriveEventOperationalLifecycle,
  EVENT_CAPABILITY_MODULES,
  EVENT_OPERATIONAL_LIFECYCLE_ORDER,
} from "@/lib/calendar/canonical-event";

describe("canonical Event lock", () => {
  it("names Event as the sole canonical model", () => {
    expect(CANONICAL_EVENT_MODEL).toBe("Event");
    expect(FORBIDDEN_COMPETING_EVENT_MODEL_NAMES).toContain("CalendarEvent");
    expect(FORBIDDEN_COMPETING_EVENT_MODEL_NAMES).toContain("MissionEvent");
  });

  it("throws on competing model names", () => {
    expect(() => assertNoCompetingEventModelName("MissionEvent")).toThrow(
      /Forbidden competing event model/,
    );
    expect(() => assertNoCompetingEventModelName("Event")).not.toThrow();
  });

  it("derives operator lifecycle from persistence status", () => {
    expect(deriveEventOperationalLifecycle({ status: "DRAFT" })).toBe("DRAFT");
    expect(deriveEventOperationalLifecycle({ status: "TENTATIVE" })).toBe(
      "SCHEDULED",
    );
    expect(
      deriveEventOperationalLifecycle({
        status: "CONFIRMED",
        readinessState: "READY",
      }),
    ).toBe("READY");
    expect(deriveEventOperationalLifecycle({ status: "IN_PROGRESS" })).toBe(
      "IN_PROGRESS",
    );
    expect(
      deriveEventOperationalLifecycle({
        status: "COMPLETED",
        openFollowUpCount: 2,
      }),
    ).toBe("FOLLOW_UP");
    expect(deriveEventOperationalLifecycle({ status: "ARCHIVED" })).toBe(
      "ARCHIVED",
    );
  });

  it("lists capability modules including mission-as-attachment", () => {
    expect(EVENT_OPERATIONAL_LIFECYCLE_ORDER[0]).toBe("DRAFT");
    expect(EVENT_OPERATIONAL_LIFECYCLE_ORDER.at(-1)).toBe("ARCHIVED");
    const mission = EVENT_CAPABILITY_MODULES.find((m) => m.key === "mission");
    expect(mission?.implemented).toBe(true);
    expect(mission?.notes).toMatch(/NOT an Event/i);
    expect(EVENT_CAPABILITY_MODULES.some((m) => m.key === "expenses")).toBe(
      true,
    );
  });
});
