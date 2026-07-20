import { describe, expect, it } from "vitest";
import {
  assertMovementDateInRange,
  buildDayMovementBoardView,
  buildMissionTravelWorkspaceView,
  DEFAULT_TRAVEL_MOVEMENT_CONFIG,
  deriveTravelReadiness,
  detectMovementOverlaps,
  dispositionClearsForReadiness,
  evaluateTravelFindings,
  issueKey,
  scheduleFingerprint,
  validateTravelAcknowledgement,
  validateTravelLegUpsert,
  validateTravelPlanPatch,
  type MissionTravelPlanPersisted,
  type TravelMissionContext,
} from "@/lib/missions/v21/travel-movement";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";

const TZ = "America/Chicago";
const NOW = new Date("2026-07-20T14:00:00.000Z");

function context(
  overrides: Partial<TravelMissionContext> & { missionId: string },
): TravelMissionContext {
  return {
    missionId: overrides.missionId,
    title: overrides.title ?? `Mission ${overrides.missionId}`,
    startsAt: overrides.startsAt ?? "2026-07-20T16:00:00.000Z",
    endsAt: overrides.endsAt ?? "2026-07-20T18:00:00.000Z",
    timezone: TZ,
    locationLabel: overrides.locationLabel ?? "Conway",
    campaignDateKey: overrides.campaignDateKey ?? "2026-07-20",
    lifecyclePhase: overrides.lifecyclePhase ?? "PREPARE",
    operationalStatus: overrides.operationalStatus ?? "READY",
    eventTravelRequired: overrides.eventTravelRequired ?? true,
    isCancelled: overrides.isCancelled ?? false,
    preparationExists: overrides.preparationExists ?? true,
    preparationReadiness: overrides.preparationReadiness ?? "READY",
  };
}

function plan(
  overrides: Partial<MissionTravelPlanPersisted> & { id: string; missionId: string },
): MissionTravelPlanPersisted {
  return {
    id: overrides.id,
    missionId: overrides.missionId,
    campaignDateKey: overrides.campaignDateKey ?? "2026-07-20",
    status: overrides.status ?? "ACTIVE",
    readinessState: overrides.readinessState ?? "NOT_ASSESSED",
    movementRequired: overrides.movementRequired ?? true,
    plannedReadyAt: overrides.plannedReadyAt ?? null,
    plannedDepartureAt: overrides.plannedDepartureAt ?? null,
    requiredArrivalAt: overrides.requiredArrivalAt ?? null,
    bufferMinutes: overrides.bufferMinutes ?? null,
    driverRequired: overrides.driverRequired ?? false,
    vehicleRequired: overrides.vehicleRequired ?? false,
    driverName: overrides.driverName ?? null,
    driverUserId: overrides.driverUserId ?? null,
    vehicleDescription: overrides.vehicleDescription ?? null,
    passengerNotes: overrides.passengerNotes ?? null,
    accessibilityNotes: overrides.accessibilityNotes ?? null,
    securityNotes: overrides.securityNotes ?? null,
    logisticsNotes: overrides.logisticsNotes ?? null,
    acceptedRiskSummary: overrides.acceptedRiskSummary ?? null,
    internalNotes: overrides.internalNotes ?? null,
    scheduleFingerprint: overrides.scheduleFingerprint ?? null,
    confirmedAt: overrides.confirmedAt ?? null,
    confirmedByUserId: overrides.confirmedByUserId ?? null,
    createdByUserId: overrides.createdByUserId ?? null,
    updatedByUserId: overrides.updatedByUserId ?? null,
    createdAt: overrides.createdAt ?? NOW.toISOString(),
    updatedAt: overrides.updatedAt ?? NOW.toISOString(),
    legs: overrides.legs ?? [],
    acknowledgements: overrides.acknowledgements ?? [],
  };
}

describe("V2.1 Travel and Movement Operations", () => {
  it("accepts today and limited future/past; rejects far past", () => {
    expect(assertMovementDateInRange("2026-07-20", NOW, TZ).ok).toBe(true);
    expect(assertMovementDateInRange("2026-08-10", NOW, TZ).ok).toBe(true);
    expect(assertMovementDateInRange("2026-06-01", NOW, TZ).ok).toBe(false);
  });

  it("uses campaign timezone near UTC midnight", () => {
    const near = new Date("2026-07-21T04:30:00.000Z");
    expect(campaignDateKey(near, TZ)).toBe("2026-07-20");
  });

  it("does not fabricate findings without stored evidence", () => {
    const ctx = context({ missionId: "m1", eventTravelRequired: false });
    const findings = evaluateTravelFindings({
      context: ctx,
      plan: null,
      config: DEFAULT_TRAVEL_MOVEMENT_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "NO_PLAN")).toBe(false);
    expect(deriveTravelReadiness({ context: ctx, plan: null, findings })).toBe(
      "NOT_REQUIRED",
    );
  });

  it("blocks when movement required and no plan exists", () => {
    const ctx = context({ missionId: "m1", eventTravelRequired: true });
    const findings = evaluateTravelFindings({
      context: ctx,
      plan: null,
      config: DEFAULT_TRAVEL_MOVEMENT_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "NO_PLAN")).toBe(true);
    expect(findings.find((f) => f.issueType === "NO_PLAN")?.severity).toBe(
      "BLOCKER",
    );
  });

  it("does not require driver or vehicle unless explicitly flagged", () => {
    const ctx = context({ missionId: "m1" });
    const p = plan({
      id: "p1",
      missionId: "m1",
      plannedDepartureAt: "2026-07-20T14:30:00.000Z",
      driverRequired: false,
      vehicleRequired: false,
      legs: [
        {
          id: "l1",
          sequence: 1,
          originLabel: "HQ",
          destinationLabel: "Conway",
          plannedDepartureAt: null,
          plannedArrivalAt: null,
          mode: "DRIVE",
          driverName: null,
          vehicleDescription: null,
          bufferMinutes: null,
          instructions: null,
          status: "PLANNED",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateTravelFindings({
      context: ctx,
      plan: p,
      config: DEFAULT_TRAVEL_MOVEMENT_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "MISSING_DRIVER")).toBe(false);
    expect(findings.some((f) => f.issueType === "MISSING_VEHICLE")).toBe(false);
  });

  it("requires driver only when driverRequired is true", () => {
    const ctx = context({ missionId: "m1" });
    const p = plan({
      id: "p1",
      missionId: "m1",
      plannedDepartureAt: "2026-07-20T14:30:00.000Z",
      driverRequired: true,
      legs: [
        {
          id: "l1",
          sequence: 1,
          originLabel: "HQ",
          destinationLabel: "Conway",
          plannedDepartureAt: null,
          plannedArrivalAt: null,
          mode: "DRIVE",
          driverName: null,
          vehicleDescription: null,
          bufferMinutes: null,
          instructions: null,
          status: "PLANNED",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateTravelFindings({
      context: ctx,
      plan: p,
      config: DEFAULT_TRAVEL_MOVEMENT_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "MISSING_DRIVER")).toBe(true);
  });

  it("detects departure after Mission start from stored times only", () => {
    const ctx = context({
      missionId: "m1",
      startsAt: "2026-07-20T16:00:00.000Z",
    });
    const p = plan({
      id: "p1",
      missionId: "m1",
      plannedDepartureAt: "2026-07-20T17:00:00.000Z",
      legs: [
        {
          id: "l1",
          sequence: 1,
          originLabel: "HQ",
          destinationLabel: "Conway",
          plannedDepartureAt: null,
          plannedArrivalAt: null,
          mode: "DRIVE",
          driverName: null,
          vehicleDescription: null,
          bufferMinutes: null,
          instructions: null,
          status: "PLANNED",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateTravelFindings({
      context: ctx,
      plan: p,
      config: DEFAULT_TRAVEL_MOVEMENT_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "TIME_CONFLICT")).toBe(true);
  });

  it("ACKNOWLEDGED does not clear blockers; ACCEPTED_RISK does for readiness", () => {
    expect(dispositionClearsForReadiness("ACKNOWLEDGED")).toBe(false);
    expect(dispositionClearsForReadiness("ACCEPTED_RISK")).toBe(true);
    expect(dispositionClearsForReadiness("RESOLVED")).toBe(true);
    expect(dispositionClearsForReadiness("NOT_APPLICABLE")).toBe(true);

    const ctx = context({ missionId: "m1" });
    const baseFindings = evaluateTravelFindings({
      context: ctx,
      plan: null,
      config: DEFAULT_TRAVEL_MOVEMENT_CONFIG,
    });
    const ackOnly = baseFindings.map((f) => ({
      ...f,
      disposition: "ACKNOWLEDGED" as const,
      clearsForReadiness: false,
    }));
    expect(deriveTravelReadiness({ context: ctx, plan: null, findings: ackOnly })).toBe(
      "NOT_READY",
    );

    const accepted = baseFindings.map((f) => ({
      ...f,
      disposition: "ACCEPTED_RISK" as const,
      clearsForReadiness: true,
    }));
    // No plan still yields NOT_READY because plan absence is structural —
    // accepted risk on findings attached to plan-less NO_PLAN with clears still
    // leaves readiness NOT_READY when plan is null.
    expect(
      deriveTravelReadiness({ context: ctx, plan: null, findings: accepted }),
    ).toBe("NOT_READY");

    const readyPlan = plan({
      id: "p1",
      missionId: "m1",
      plannedDepartureAt: "2026-07-20T14:30:00.000Z",
      acknowledgements: [
        {
          id: "a1",
          issueKey: issueKey("MISSING_DRIVER", "p1"),
          issueType: "MISSING_DRIVER",
          title: "Driver",
          disposition: "ACCEPTED_RISK",
          note: null,
          acceptedRiskReason: "Volunteer driving",
          acknowledgedAt: NOW.toISOString(),
          acknowledgedByUserId: "u1",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
      driverRequired: true,
      legs: [
        {
          id: "l1",
          sequence: 1,
          originLabel: "HQ",
          destinationLabel: "Conway",
          plannedDepartureAt: null,
          plannedArrivalAt: null,
          mode: "DRIVE",
          driverName: null,
          vehicleDescription: null,
          bufferMinutes: null,
          instructions: null,
          status: "PLANNED",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const withAck = evaluateTravelFindings({
      context: ctx,
      plan: readyPlan,
      config: DEFAULT_TRAVEL_MOVEMENT_CONFIG,
    });
    expect(
      deriveTravelReadiness({ context: ctx, plan: readyPlan, findings: withAck }),
    ).toBe("READY_WITH_ACCEPTED_RISK");
  });

  it("detects stale confirmation after schedule fingerprint change", () => {
    const ctx = context({
      missionId: "m1",
      startsAt: "2026-07-20T17:00:00.000Z",
      endsAt: "2026-07-20T19:00:00.000Z",
    });
    const p = plan({
      id: "p1",
      missionId: "m1",
      plannedDepartureAt: "2026-07-20T15:00:00.000Z",
      scheduleFingerprint: scheduleFingerprint(
        "2026-07-20T16:00:00.000Z",
        "2026-07-20T18:00:00.000Z",
      ),
      legs: [
        {
          id: "l1",
          sequence: 1,
          originLabel: "HQ",
          destinationLabel: "Conway",
          plannedDepartureAt: null,
          plannedArrivalAt: null,
          mode: "DRIVE",
          driverName: null,
          vehicleDescription: null,
          bufferMinutes: null,
          instructions: null,
          status: "PLANNED",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateTravelFindings({
      context: ctx,
      plan: p,
      config: DEFAULT_TRAVEL_MOVEMENT_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "STALE_AFTER_RESCHEDULE")).toBe(
      true,
    );
  });

  it("detects movement overlaps deterministically", () => {
    const map = detectMovementOverlaps([
      {
        missionId: "a",
        departureAt: "2026-07-20T13:00:00.000Z",
        arrivalAt: "2026-07-20T15:00:00.000Z",
        startsAt: "2026-07-20T15:00:00.000Z",
      },
      {
        missionId: "b",
        departureAt: "2026-07-20T14:00:00.000Z",
        arrivalAt: "2026-07-20T16:00:00.000Z",
        startsAt: "2026-07-20T16:00:00.000Z",
      },
    ]);
    expect(map.get("a")).toContain("b");
  });

  it("rejects forbidden Mission lifecycle fields and oversized text", () => {
    expect(
      validateTravelPlanPatch(
        { lifecyclePhase: "EXECUTE" },
        DEFAULT_TRAVEL_MOVEMENT_CONFIG,
      ).ok,
    ).toBe(false);
    expect(
      validateTravelPlanPatch(
        { startsAt: "2026-07-20T12:00:00.000Z" },
        DEFAULT_TRAVEL_MOVEMENT_CONFIG,
      ).ok,
    ).toBe(false);
    expect(
      validateTravelLegUpsert(
        {
          originLabel: "A",
          destinationLabel: "B",
          plannedDepartureAt: "2026-07-20T16:00:00.000Z",
          plannedArrivalAt: "2026-07-20T15:00:00.000Z",
        },
        DEFAULT_TRAVEL_MOVEMENT_CONFIG,
      ).ok,
    ).toBe(false);
  });

  it("requires accepted risk reason", () => {
    expect(
      validateTravelAcknowledgement({
        issueKey: "NO_PLAN:m1",
        issueType: "NO_PLAN",
        title: "No plan",
        disposition: "ACCEPTED_RISK",
      }).ok,
    ).toBe(false);
    expect(
      validateTravelAcknowledgement({
        issueKey: "NO_PLAN:m1",
        issueType: "NO_PLAN",
        title: "No plan",
        disposition: "ACCEPTED_RISK",
        acceptedRiskReason: "Leadership approved",
      }).ok,
    ).toBe(true);
  });

  it("builds workspace without mutating isolation flags", () => {
    const vm = buildMissionTravelWorkspaceView({
      context: context({ missionId: "m1" }),
      plan: null,
    });
    expect(vm.plan.exists).toBe(false);
    expect(vm.isolation.mutatesMissionLifecycle).toBe(false);
    expect(vm.isolation.startsExecution).toBe(false);
    expect(vm.boundaryMessage).toMatch(/does not start or complete/i);
  });

  it("separates first and primary Mission on day board", () => {
    const early = context({
      missionId: "early",
      title: "Early",
      startsAt: "2026-07-20T14:00:00.000Z",
      endsAt: "2026-07-20T15:00:00.000Z",
      eventTravelRequired: false,
    });
    const later = context({
      missionId: "later",
      title: "Later",
      startsAt: "2026-07-20T18:00:00.000Z",
      endsAt: "2026-07-20T20:00:00.000Z",
      lifecyclePhase: "EXECUTE",
      eventTravelRequired: false,
    });
    const board = buildDayMovementBoardView({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      missions: [later, early],
      plansByMissionId: new Map(),
    });
    expect(board.missions.find((m) => m.isFirst)?.missionId).toBe("early");
    expect(board.isolation.launchesCampaignDay).toBe(false);
    expect(board.isolation.startsExecution).toBe(false);
  });

  it("warns on cancelled Mission with active plan without deleting history", () => {
    const ctx = context({
      missionId: "m1",
      isCancelled: true,
      eventTravelRequired: false,
    });
    const p = plan({ id: "p1", missionId: "m1", status: "ACTIVE" });
    const findings = evaluateTravelFindings({
      context: ctx,
      plan: p,
      config: DEFAULT_TRAVEL_MOVEMENT_CONFIG,
    });
    expect(
      findings.some((f) => f.issueType === "CANCELLED_MISSION_ACTIVE_PLAN"),
    ).toBe(true);
  });

  it("keeps issue keys stable", () => {
    expect(issueKey("NO_PLAN", "m1")).toBe("NO_PLAN:m1");
    expect(issueKey("MISSING_DEPARTURE", "p1")).toBe("MISSING_DEPARTURE:p1");
  });
});
