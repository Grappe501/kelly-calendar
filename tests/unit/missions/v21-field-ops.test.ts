import { describe, expect, it } from "vitest";
import {
  assertFieldOpsDateInRange,
  buildDayFieldOpsBoardView,
  buildMissionFieldOpsWorkspaceView,
  DEFAULT_FIELD_OPS_CONFIG,
  deriveFieldOpsReadiness,
  evaluateFieldOpsFindings,
  fieldOpsDispositionClearsForReadiness,
  fieldOpsIssueKey as issueKey,
  fieldOpsLogisticsFingerprint as logisticsFingerprint,
  fieldOpsScheduleFingerprint as scheduleFingerprint,
  fieldOpsTravelFingerprint as travelFingerprint,
  validateFieldConfirmationUpsert,
  validateFieldOpsAcknowledgement,
  validateFieldOpsSessionPatch,
  type FieldOpsMissionContext,
  type MissionFieldOpsSessionPersisted,
} from "@/lib/missions/v21/field-ops";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";

const TZ = "America/Chicago";
const NOW = new Date("2026-07-20T14:00:00.000Z");

function context(
  overrides: Partial<FieldOpsMissionContext> & { missionId: string },
): FieldOpsMissionContext {
  return {
    missionId: overrides.missionId,
    title: overrides.title ?? `Mission ${overrides.missionId}`,
    startsAt: overrides.startsAt ?? "2026-07-20T16:00:00.000Z",
    endsAt: overrides.endsAt ?? "2026-07-20T18:00:00.000Z",
    timezone: TZ,
    locationLabel: overrides.locationLabel ?? "Conway",
    campaignDateKey: overrides.campaignDateKey ?? "2026-07-20",
    lifecyclePhase: overrides.lifecyclePhase ?? "EXECUTE",
    operationalStatus: overrides.operationalStatus ?? "READY",
    executionStatus: overrides.executionStatus ?? "IN_PROGRESS",
    isCancelled: overrides.isCancelled ?? false,
    materialsIndicated: overrides.materialsIndicated ?? true,
    travelPlannedDepartureAt: overrides.travelPlannedDepartureAt ?? null,
    pack:
      overrides.pack === undefined
        ? {
            id: "pack1",
            status: "ACTIVE",
            logisticsRequired: true,
            items: [
              {
                id: "i1",
                sequence: 1,
                description: "Credential binder",
                quantityLabel: "1",
                status: "PACKED",
                criticality: "CRITICAL",
                returnRequired: false,
                responsibleName: "Alex",
              },
            ],
            handoffs: [],
          }
        : overrides.pack,
  };
}

function session(
  overrides: Partial<MissionFieldOpsSessionPersisted> & {
    id: string;
    missionId: string;
  },
): MissionFieldOpsSessionPersisted {
  return {
    id: overrides.id,
    missionId: overrides.missionId,
    campaignDateKey: overrides.campaignDateKey ?? "2026-07-20",
    status: overrides.status ?? "CHECKING",
    readinessState: overrides.readinessState ?? "NOT_ASSESSED",
    fieldLeadName: overrides.fieldLeadName ?? "Field Lead",
    fieldLeadUserId: overrides.fieldLeadUserId ?? null,
    locationLabel: overrides.locationLabel ?? null,
    contextNote: overrides.contextNote ?? null,
    checkInAt: overrides.checkInAt ?? NOW.toISOString(),
    checkInByUserId: overrides.checkInByUserId ?? "u1",
    readinessConfirmedAt: overrides.readinessConfirmedAt ?? null,
    readinessConfirmedByUserId: overrides.readinessConfirmedByUserId ?? null,
    wrapStartedAt: overrides.wrapStartedAt ?? null,
    wrapStartedByUserId: overrides.wrapStartedByUserId ?? null,
    closedAt: overrides.closedAt ?? null,
    closedByUserId: overrides.closedByUserId ?? null,
    acceptedRiskSummary: overrides.acceptedRiskSummary ?? null,
    internalNotes: overrides.internalNotes ?? null,
    fieldNotes: overrides.fieldNotes ?? null,
    logisticsFingerprint: overrides.logisticsFingerprint ?? null,
    scheduleFingerprint: overrides.scheduleFingerprint ?? null,
    travelFingerprint: overrides.travelFingerprint ?? null,
    createdByUserId: overrides.createdByUserId ?? "u1",
    updatedByUserId: overrides.updatedByUserId ?? "u1",
    createdAt: overrides.createdAt ?? NOW.toISOString(),
    updatedAt: overrides.updatedAt ?? NOW.toISOString(),
    confirmations: overrides.confirmations ?? [],
    acknowledgements: overrides.acknowledgements ?? [],
  };
}

describe("V2.1 Field Day Operations", () => {
  it("does not require field ops when logistics are not required", () => {
    const ctx = context({
      missionId: "m1",
      materialsIndicated: false,
      pack: {
        id: "p1",
        status: "ACTIVE",
        logisticsRequired: false,
        items: [],
        handoffs: [],
      },
    });
    const findings = evaluateFieldOpsFindings({
      context: ctx,
      session: null,
      config: DEFAULT_FIELD_OPS_CONFIG,
    });
    expect(findings).toEqual([]);
    expect(
      deriveFieldOpsReadiness({ context: ctx, session: null, findings }),
    ).toBe("NOT_REQUIRED");
  });

  it("blocks when required pack is missing", () => {
    const ctx = context({ missionId: "m1", pack: null });
    const findings = evaluateFieldOpsFindings({
      context: ctx,
      session: null,
      config: DEFAULT_FIELD_OPS_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "NO_PACK")).toBe(true);
  });

  it("blocks when critical items exist but no session is opened", () => {
    const ctx = context({ missionId: "m1" });
    const findings = evaluateFieldOpsFindings({
      context: ctx,
      session: null,
      config: DEFAULT_FIELD_OPS_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "NO_SESSION")).toBe(true);
  });

  it("does not treat PACKED as on-site presence", () => {
    const ctx = context({ missionId: "m1" });
    const s = session({ id: "s1", missionId: "m1" });
    const findings = evaluateFieldOpsFindings({
      context: ctx,
      session: s,
      config: DEFAULT_FIELD_OPS_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "CRITICAL_UNCONFIRMED")).toBe(
      true,
    );
    const view = buildMissionFieldOpsWorkspaceView({ context: ctx, session: s });
    expect(view.logisticsItems[0]?.d12StatusDoesNotImplyPresence).toBe(true);
    expect(view.logisticsItems[0]?.status).toBe("PACKED");
    expect(view.logisticsItems[0]?.confirmation).toBeNull();
  });

  it("blocks critical missing/damaged/substituted states", () => {
    const ctx = context({ missionId: "m1" });
    const s = session({
      id: "s1",
      missionId: "m1",
      confirmations: [
        {
          id: "c1",
          logisticsItemId: "i1",
          itemDescriptionSnapshot: "Credential binder",
          itemCriticalitySnapshot: "CRITICAL",
          itemReturnRequiredSnapshot: false,
          state: "MISSING",
          observedQuantityLabel: null,
          condition: "UNKNOWN",
          substituteDescription: null,
          exceptionNote: "Not in van",
          locationLabel: null,
          confirmedAt: NOW.toISOString(),
          confirmedByUserId: "u1",
          history: [],
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateFieldOpsFindings({
      context: ctx,
      session: s,
      config: DEFAULT_FIELD_OPS_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "CRITICAL_MISSING")).toBe(true);
  });

  it("ACKNOWLEDGED does not clear blockers; ACCEPTED_RISK does", () => {
    expect(fieldOpsDispositionClearsForReadiness("ACKNOWLEDGED")).toBe(false);
    expect(fieldOpsDispositionClearsForReadiness("ACCEPTED_RISK")).toBe(true);
    const ctx = context({ missionId: "m1" });
    const key = issueKey("NO_SESSION", "m1");
    const sAck = session({
      id: "s1",
      missionId: "m1",
      status: "CANCELLED",
      acknowledgements: [
        {
          id: "a1",
          issueKey: key,
          issueType: "NO_SESSION",
          title: "No session",
          disposition: "ACKNOWLEDGED",
          note: null,
          acceptedRiskReason: null,
          acknowledgedAt: NOW.toISOString(),
          acknowledgedByUserId: "u1",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    // With cancelled session and critical items, NO_SESSION fires
    const findingsAck = evaluateFieldOpsFindings({
      context: ctx,
      session: sAck,
      config: DEFAULT_FIELD_OPS_CONFIG,
    });
    expect(
      deriveFieldOpsReadiness({
        context: ctx,
        session: sAck,
        findings: findingsAck,
      }),
    ).toBe("NOT_READY");

    const sRisk = session({
      id: "s2",
      missionId: "m1",
      status: "CANCELLED",
      acknowledgements: [
        {
          id: "a2",
          issueKey: key,
          issueType: "NO_SESSION",
          title: "No session",
          disposition: "ACCEPTED_RISK",
          note: null,
          acceptedRiskReason: "Kit already staged on site",
          acknowledgedAt: NOW.toISOString(),
          acknowledgedByUserId: "u1",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findingsRisk = evaluateFieldOpsFindings({
      context: ctx,
      session: sRisk,
      config: DEFAULT_FIELD_OPS_CONFIG,
    });
    expect(
      deriveFieldOpsReadiness({
        context: ctx,
        session: sRisk,
        findings: findingsRisk,
      }),
    ).toBe("READY_WITH_ACCEPTED_RISK");
  });

  it("marks readiness stale after logistics fingerprint change", () => {
    const ctx = context({ missionId: "m1" });
    const items = ctx.pack!.items;
    const s = session({
      id: "s1",
      missionId: "m1",
      logisticsFingerprint: "old-fingerprint",
      scheduleFingerprint: scheduleFingerprint(ctx.startsAt, ctx.endsAt),
      travelFingerprint: travelFingerprint(null),
      confirmations: [
        {
          id: "c1",
          logisticsItemId: "i1",
          itemDescriptionSnapshot: "Credential binder",
          itemCriticalitySnapshot: "CRITICAL",
          itemReturnRequiredSnapshot: false,
          state: "PRESENT",
          observedQuantityLabel: "1",
          condition: "GOOD",
          substituteDescription: null,
          exceptionNote: null,
          locationLabel: null,
          confirmedAt: NOW.toISOString(),
          confirmedByUserId: "u1",
          history: [],
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    expect(logisticsFingerprint(items)).not.toBe("old-fingerprint");
    const findings = evaluateFieldOpsFindings({
      context: ctx,
      session: s,
      config: DEFAULT_FIELD_OPS_CONFIG,
    });
    expect(
      findings.some((f) => f.issueType === "STALE_AFTER_LOGISTICS_CHANGE"),
    ).toBe(true);
  });

  it("tracks return outstanding at wrap without fabricating returns", () => {
    const ctx = context({
      missionId: "m1",
      pack: {
        id: "p1",
        status: "ACTIVE",
        logisticsRequired: true,
        items: [
          {
            id: "i1",
            sequence: 1,
            description: "Camera",
            quantityLabel: "1",
            status: "READY",
            criticality: "STANDARD",
            returnRequired: true,
            responsibleName: "Alex",
          },
        ],
        handoffs: [],
      },
    });
    const s = session({
      id: "s1",
      missionId: "m1",
      status: "WRAP_PENDING",
      wrapStartedAt: NOW.toISOString(),
      confirmations: [
        {
          id: "c1",
          logisticsItemId: "i1",
          itemDescriptionSnapshot: "Camera",
          itemCriticalitySnapshot: "STANDARD",
          itemReturnRequiredSnapshot: true,
          state: "PRESENT",
          observedQuantityLabel: "1",
          condition: "GOOD",
          substituteDescription: null,
          exceptionNote: null,
          locationLabel: null,
          confirmedAt: NOW.toISOString(),
          confirmedByUserId: "u1",
          history: [],
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateFieldOpsFindings({
      context: ctx,
      session: s,
      config: DEFAULT_FIELD_OPS_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "RETURN_OUTSTANDING")).toBe(
      true,
    );
  });

  it("keeps first Mission distinct from primary on day board", () => {
    const early = context({
      missionId: "early",
      startsAt: "2026-07-20T13:00:00.000Z",
      endsAt: "2026-07-20T14:00:00.000Z",
      lifecyclePhase: "PREPARE",
      materialsIndicated: false,
      pack: {
        id: "p0",
        status: "ACTIVE",
        logisticsRequired: false,
        items: [],
        handoffs: [],
      },
    });
    const primary = context({
      missionId: "primary",
      startsAt: "2026-07-20T16:00:00.000Z",
      endsAt: "2026-07-20T18:00:00.000Z",
      lifecyclePhase: "EXECUTE",
      materialsIndicated: false,
      pack: {
        id: "p1",
        status: "ACTIVE",
        logisticsRequired: false,
        items: [],
        handoffs: [],
      },
    });
    const board = buildDayFieldOpsBoardView({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      missions: [primary, early],
      sessionsByMissionId: new Map(),
    });
    expect(board.missions.find((m) => m.isFirst)?.missionId).toBe("early");
    expect(board.isolation.startsExecution).toBe(false);
    expect(board.summary.withSessionCount).toBe(0);
  });

  it("workspace never fabricates a session on build", () => {
    const view = buildMissionFieldOpsWorkspaceView({
      context: context({ missionId: "m1" }),
      session: null,
    });
    expect(view.session.exists).toBe(false);
    expect(view.isolation.mutatesExecuteStatus).toBe(false);
    expect(view.isolation.mutatesLogisticsItemStatus).toBe(false);
  });

  it("validates payloads and requires substitute description", () => {
    expect(
      validateFieldOpsSessionPatch(
        { fieldLeadName: "Sam", confirmReadiness: true },
        DEFAULT_FIELD_OPS_CONFIG,
      ).ok,
    ).toBe(true);
    expect(
      validateFieldConfirmationUpsert(
        { logisticsItemId: "i1", state: "PRESENT" },
        DEFAULT_FIELD_OPS_CONFIG,
      ).ok,
    ).toBe(true);
    expect(
      validateFieldConfirmationUpsert(
        { logisticsItemId: "i1", state: "SUBSTITUTED" },
        DEFAULT_FIELD_OPS_CONFIG,
      ).ok,
    ).toBe(false);
    expect(
      validateFieldOpsAcknowledgement({
        issueKey: "NO_SESSION:m1",
        issueType: "NO_SESSION",
        title: "No session",
        disposition: "ACCEPTED_RISK",
        acceptedRiskReason: "Already staged",
      }).ok,
    ).toBe(true);
  });

  it("uses campaign-local today for date range", () => {
    const today = campaignDateKey(NOW, TZ);
    expect(assertFieldOpsDateInRange(today, NOW, TZ).ok).toBe(true);
  });
});
