import { describe, expect, it } from "vitest";
import {
  computeConflictFactFingerprint,
  computeConflictKey,
  detectAvailabilityViolationConflicts,
  detectBufferConflicts,
  detectTimeOverlapConflicts,
  detectTravelInfeasibleConflicts,
  type Cc06AvailabilityInput,
  type Cc06BufferInput,
  type Cc06OverlapEvent,
  type Cc06TravelInput,
} from "@/features/operational-intelligence/services/conflict-service";
import type { AvailabilityFinding } from "@/lib/calendar/availability/types";

function overlapEvent(overrides: Partial<Cc06OverlapEvent> & Pick<Cc06OverlapEvent, "id">): Cc06OverlapEvent {
  return {
    label: overrides.id,
    startsAt: new Date("2026-08-01T10:00:00Z"),
    endsAt: new Date("2026-08-01T11:00:00Z"),
    status: "CONFIRMED",
    candidateAttending: true,
    ...overrides,
  };
}

function baseFinding(overrides: Partial<AvailabilityFinding> = {}): AvailabilityFinding {
  return {
    key: "f1",
    classification: "UNAVAILABLE",
    severity: "blocking",
    explanation: "Standing office hours",
    blocksSave: true,
    requiresAcknowledgement: true,
    overlapStartsAt: new Date("2026-08-01T10:00:00Z"),
    overlapEndsAt: new Date("2026-08-01T11:00:00Z"),
    ruleId: "rule1",
    ...overrides,
  } as AvailabilityFinding;
}

describe("detectTimeOverlapConflicts (CC-06)", () => {
  it("treats a touching boundary as non-overlapping (half-open intervals)", () => {
    const events = [
      overlapEvent({ id: "a", endsAt: new Date("2026-08-01T11:00:00Z") }),
      overlapEvent({ id: "b", startsAt: new Date("2026-08-01T11:00:00Z"), endsAt: new Date("2026-08-01T12:00:00Z") }),
    ];
    expect(detectTimeOverlapConflicts(events)).toHaveLength(0);
  });

  it("detects a true overlap between two confirmed events as CRITICAL", () => {
    const events = [
      overlapEvent({ id: "a", endsAt: new Date("2026-08-01T11:30:00Z") }),
      overlapEvent({ id: "b", startsAt: new Date("2026-08-01T11:00:00Z"), endsAt: new Date("2026-08-01T12:00:00Z") }),
    ];
    const conflicts = detectTimeOverlapConflicts(events);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe("TIME_OVERLAP");
    expect(conflicts[0].severity).toBe("CRITICAL");
    expect(conflicts[0].automaticallyResolved).toBe(false);
  });

  it("downgrades severity when at least one event is not confirmed", () => {
    const events = [
      overlapEvent({ id: "a", endsAt: new Date("2026-08-01T11:30:00Z"), status: "TENTATIVE" }),
      overlapEvent({ id: "b", startsAt: new Date("2026-08-01T11:00:00Z"), endsAt: new Date("2026-08-01T12:00:00Z") }),
    ];
    const conflicts = detectTimeOverlapConflicts(events);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].severity).toBe("WARNING");
  });

  it("excludes CANCELLED/DECLINED/ARCHIVED and non-attending events", () => {
    const cancelled = detectTimeOverlapConflicts([
      overlapEvent({ id: "a", endsAt: new Date("2026-08-01T11:30:00Z"), status: "CANCELLED" }),
      overlapEvent({ id: "b", startsAt: new Date("2026-08-01T11:00:00Z"), endsAt: new Date("2026-08-01T12:00:00Z") }),
    ]);
    expect(cancelled).toHaveLength(0);

    const notAttending = detectTimeOverlapConflicts([
      overlapEvent({ id: "a", endsAt: new Date("2026-08-01T11:30:00Z"), candidateAttending: false }),
      overlapEvent({ id: "b", startsAt: new Date("2026-08-01T11:00:00Z"), endsAt: new Date("2026-08-01T12:00:00Z") }),
    ]);
    expect(notAttending).toHaveLength(0);
  });
});

describe("computeConflictKey (CC-06)", () => {
  it("is stable regardless of entity-id ordering", () => {
    const overlapStartsAt = new Date("2026-08-01T11:00:00Z");
    const overlapEndsAt = new Date("2026-08-01T11:30:00Z");
    const k1 = computeConflictKey({ conflictType: "TIME_OVERLAP", entityIds: ["b", "a"], overlapStartsAt, overlapEndsAt });
    const k2 = computeConflictKey({ conflictType: "TIME_OVERLAP", entityIds: ["a", "b"], overlapStartsAt, overlapEndsAt });
    expect(k1).toBe(k2);
  });

  it("changes when the conflict type or window changes", () => {
    const overlapStartsAt = new Date("2026-08-01T11:00:00Z");
    const overlapEndsAt = new Date("2026-08-01T11:30:00Z");
    const base = computeConflictKey({ conflictType: "TIME_OVERLAP", entityIds: ["a", "b"], overlapStartsAt, overlapEndsAt });
    const differentType = computeConflictKey({ conflictType: "BUFFER_CONFLICT", entityIds: ["a", "b"], overlapStartsAt, overlapEndsAt });
    const differentWindow = computeConflictKey({
      conflictType: "TIME_OVERLAP",
      entityIds: ["a", "b"],
      overlapStartsAt,
      overlapEndsAt: new Date("2026-08-01T12:00:00Z"),
    });
    expect(differentType).not.toBe(base);
    expect(differentWindow).not.toBe(base);
  });
});

describe("computeConflictFactFingerprint (CC-06)", () => {
  it("is stable for identical facts and changes when facts drift", () => {
    const a = computeConflictFactFingerprint({ severity: "WARNING", explanation: "x", evidence: ["e1", "e2"] });
    const b = computeConflictFactFingerprint({ severity: "WARNING", explanation: "x", evidence: ["e2", "e1"] });
    expect(a).toBe(b); // evidence order should not matter (sorted internally)

    const c = computeConflictFactFingerprint({ severity: "CRITICAL", explanation: "x", evidence: ["e1", "e2"] });
    expect(c).not.toBe(a);
  });
});

describe("detectAvailabilityViolationConflicts (CC-06)", () => {
  it("fires only from UNAVAILABLE findings, never from PREFERRED/CONSTRAINED", () => {
    const unavailable: Cc06AvailabilityInput = { event: { id: "e1", label: "Event 1" }, finding: baseFinding() };
    const conflicts = detectAvailabilityViolationConflicts([unavailable]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe("AVAILABILITY_VIOLATION");
    expect(conflicts[0].severity).toBe("CRITICAL");
    expect(conflicts[0].automaticallyResolved).toBe(false);

    const preferred: Cc06AvailabilityInput = {
      event: { id: "e1", label: "Event 1" },
      finding: baseFinding({ classification: "PREFERRED" }),
    };
    expect(detectAvailabilityViolationConflicts([preferred])).toHaveLength(0);

    const constrained: Cc06AvailabilityInput = {
      event: { id: "e1", label: "Event 1" },
      finding: baseFinding({ classification: "CONSTRAINED" }),
    };
    expect(detectAvailabilityViolationConflicts([constrained])).toHaveLength(0);
  });
});

describe("detectBufferConflicts (CC-06)", () => {
  it("fires only from explicit buffer rule types on CONSTRAINED/REQUIRES_REVIEW findings", () => {
    const finding = baseFinding({ classification: "CONSTRAINED", ruleId: "rule2" });
    const travelBuffer: Cc06BufferInput = { event: { id: "e1", label: "Event 1" }, finding, ruleType: "TRAVEL_BUFFER" };
    const conflicts = detectBufferConflicts([travelBuffer]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe("BUFFER_CONFLICT");

    const protectedWork: Cc06BufferInput = { event: { id: "e1", label: "Event 1" }, finding, ruleType: "PROTECTED_WORK" };
    expect(detectBufferConflicts([protectedWork])).toHaveLength(0);

    const noRuleType: Cc06BufferInput = { event: { id: "e1", label: "Event 1" }, finding };
    expect(detectBufferConflicts([noRuleType])).toHaveLength(0);
  });
});

describe("detectTravelInfeasibleConflicts (CC-06)", () => {
  function travelInput(overrides: Partial<Cc06TravelInput> = {}): Cc06TravelInput {
    return {
      previousEvent: { id: "p", label: "Prev", endsAt: new Date("2026-08-01T10:00:00Z") },
      nextEvent: { id: "n", label: "Next", startsAt: new Date("2026-08-01T10:05:00Z") },
      estimatedTravelMinutes: 60,
      bufferMinutes: 15,
      ...overrides,
    };
  }

  it("never flags UNKNOWN (no stored travel minutes)", () => {
    expect(detectTravelInfeasibleConflicts([travelInput({ estimatedTravelMinutes: null })])).toHaveLength(0);
    expect(detectTravelInfeasibleConflicts([travelInput({ estimatedTravelMinutes: undefined })])).toHaveLength(0);
  });

  it("fires only from stored facts when infeasible", () => {
    const conflicts = detectTravelInfeasibleConflicts([travelInput()]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe("TRAVEL_INFEASIBLE");
    expect(conflicts[0].automaticallyResolved).toBe(false);
  });

  it("does not fire when there is ample stored travel time", () => {
    const conflicts = detectTravelInfeasibleConflicts([
      travelInput({
        nextEvent: { id: "n", label: "Next", startsAt: new Date("2026-08-01T12:00:00Z") },
        estimatedTravelMinutes: 30,
        bufferMinutes: 10,
      }),
    ]);
    expect(conflicts).toHaveLength(0);
  });
});
