import { describe, expect, it } from "vitest";
import {
  assertLogisticsDateInRange,
  buildDayLogisticsBoardView,
  buildMissionLogisticsWorkspaceView,
  DEFAULT_LOGISTICS_PACK_CONFIG,
  deriveLogisticsReadiness,
  logisticsDispositionClearsForReadiness as dispositionClearsForReadiness,
  evaluateLogisticsFindings,
  logisticsIssueKey as issueKey,
  logisticsScheduleFingerprint as scheduleFingerprint,
  logisticsTravelFingerprint as travelFingerprint,
  validateLogisticsAcknowledgement,
  validateLogisticsHandoffUpsert,
  validateLogisticsItemUpsert,
  validateLogisticsPackPatch,
  type LogisticsMissionContext,
  type MissionLogisticsPackPersisted,
} from "@/lib/missions/v21/logistics-pack";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";

const TZ = "America/Chicago";
const NOW = new Date("2026-07-20T14:00:00.000Z");

function context(
  overrides: Partial<LogisticsMissionContext> & { missionId: string },
): LogisticsMissionContext {
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
    isCancelled: overrides.isCancelled ?? false,
    materialsIndicated: overrides.materialsIndicated ?? false,
    travelPlannedDepartureAt: overrides.travelPlannedDepartureAt ?? null,
  };
}

function pack(
  overrides: Partial<MissionLogisticsPackPersisted> & {
    id: string;
    missionId: string;
  },
): MissionLogisticsPackPersisted {
  return {
    id: overrides.id,
    missionId: overrides.missionId,
    campaignDateKey: overrides.campaignDateKey ?? "2026-07-20",
    label: overrides.label ?? "Field kit",
    status: overrides.status ?? "ACTIVE",
    readinessState: overrides.readinessState ?? "NOT_ASSESSED",
    logisticsRequired: overrides.logisticsRequired ?? true,
    packOwnerName: overrides.packOwnerName ?? "Ops Lead",
    packOwnerUserId: overrides.packOwnerUserId ?? null,
    assemblyLocation: overrides.assemblyLocation ?? null,
    plannedHandoffAt: overrides.plannedHandoffAt ?? null,
    plannedHandoffLocation: overrides.plannedHandoffLocation ?? null,
    relatedTravelPlanId: overrides.relatedTravelPlanId ?? null,
    acceptedRiskSummary: overrides.acceptedRiskSummary ?? null,
    internalNotes: overrides.internalNotes ?? null,
    logisticsNotes: overrides.logisticsNotes ?? null,
    scheduleFingerprint: overrides.scheduleFingerprint ?? null,
    travelFingerprint: overrides.travelFingerprint ?? null,
    confirmedAt: overrides.confirmedAt ?? null,
    confirmedByUserId: overrides.confirmedByUserId ?? null,
    createdByUserId: overrides.createdByUserId ?? null,
    updatedByUserId: overrides.updatedByUserId ?? null,
    createdAt: overrides.createdAt ?? NOW.toISOString(),
    updatedAt: overrides.updatedAt ?? NOW.toISOString(),
    items: overrides.items ?? [],
    handoffs: overrides.handoffs ?? [],
    acknowledgements: overrides.acknowledgements ?? [],
  };
}

describe("V2.1 Mission Logistics Pack", () => {
  it("does not require a pack when logistics are not indicated", () => {
    const ctx = context({ missionId: "m1", materialsIndicated: false });
    const findings = evaluateLogisticsFindings({
      context: ctx,
      pack: null,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(findings).toEqual([]);
    expect(
      deriveLogisticsReadiness({ context: ctx, pack: null, findings }),
    ).toBe("NOT_REQUIRED");
  });

  it("blocks when materials are indicated but no active pack exists", () => {
    const ctx = context({ missionId: "m1", materialsIndicated: true });
    const findings = evaluateLogisticsFindings({
      context: ctx,
      pack: null,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "NO_PACK")).toBe(true);
    expect(
      deriveLogisticsReadiness({ context: ctx, pack: null, findings }),
    ).toBe("NOT_READY");
  });

  it("blocks critical unassigned and unpacked items", () => {
    const ctx = context({ missionId: "m1", materialsIndicated: true });
    const p = pack({
      id: "p1",
      missionId: "m1",
      items: [
        {
          id: "i1",
          sequence: 1,
          category: "DOCUMENTS",
          description: "Credential binder",
          quantityLabel: "1",
          responsibleName: null,
          responsibleUserId: null,
          recipientName: null,
          requiredByAt: null,
          packLocation: null,
          status: "REQUIRED",
          criticality: "CRITICAL",
          returnRequired: false,
          notes: null,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateLogisticsFindings({
      context: ctx,
      pack: p,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "CRITICAL_UNASSIGNED")).toBe(
      true,
    );
    expect(findings.some((f) => f.issueType === "CRITICAL_NOT_PACKED")).toBe(
      true,
    );
  });

  it("blocks when departure is stored and critical items are not packed", () => {
    const ctx = context({
      missionId: "m1",
      materialsIndicated: true,
      travelPlannedDepartureAt: "2026-07-20T14:30:00.000Z",
    });
    const p = pack({
      id: "p1",
      missionId: "m1",
      items: [
        {
          id: "i1",
          sequence: 1,
          category: "TECHNOLOGY",
          description: "Mic kit",
          quantityLabel: "1",
          responsibleName: "Alex",
          responsibleUserId: null,
          recipientName: null,
          requiredByAt: null,
          packLocation: null,
          status: "ASSIGNED",
          criticality: "CRITICAL",
          returnRequired: false,
          notes: null,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateLogisticsFindings({
      context: ctx,
      pack: p,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "DEPARTURE_NOT_READY")).toBe(
      true,
    );
  });

  it("keeps giver and receiver confirmation findings distinct", () => {
    const ctx = context({ missionId: "m1", materialsIndicated: true });
    const p = pack({
      id: "p1",
      missionId: "m1",
      items: [
        {
          id: "i1",
          sequence: 1,
          category: "SIGNAGE",
          description: "Yard signs",
          quantityLabel: "10",
          responsibleName: "Alex",
          responsibleUserId: null,
          recipientName: "Sam",
          requiredByAt: null,
          packLocation: null,
          status: "PACKED",
          criticality: "STANDARD",
          returnRequired: false,
          notes: null,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
      handoffs: [
        {
          id: "h1",
          logisticsItemId: "i1",
          fromName: "Alex",
          toName: "Sam",
          plannedAt: null,
          plannedLocation: null,
          actualAt: null,
          actualLocation: null,
          status: "IN_PROGRESS",
          giverConfirmedAt: NOW.toISOString(),
          giverConfirmedByUserId: "u1",
          receiverConfirmedAt: null,
          receiverConfirmedByUserId: null,
          notes: null,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateLogisticsFindings({
      context: ctx,
      pack: p,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "HANDOFF_PARTIAL_CONFIRM")).toBe(
      true,
    );
    expect(findings.some((f) => f.issueType === "HANDOFF_INCOMPLETE")).toBe(
      true,
    );
  });

  it("ACKNOWLEDGED does not clear blockers; ACCEPTED_RISK does for readiness", () => {
    expect(dispositionClearsForReadiness("ACKNOWLEDGED")).toBe(false);
    expect(dispositionClearsForReadiness("ACCEPTED_RISK")).toBe(true);
    const ctx = context({ missionId: "m1", materialsIndicated: true });
    const issue = issueKey("NO_PACK", "m1");
    const findingsOpen = evaluateLogisticsFindings({
      context: ctx,
      pack: null,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(deriveLogisticsReadiness({ context: ctx, pack: null, findings: findingsOpen })).toBe(
      "NOT_READY",
    );

    const p = pack({
      id: "p1",
      missionId: "m1",
      status: "INACTIVE",
      acknowledgements: [
        {
          id: "a1",
          issueKey: issue,
          issueType: "NO_PACK",
          title: "Logistics required but no active pack",
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
    const findingsAck = evaluateLogisticsFindings({
      context: ctx,
      pack: p,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(
      deriveLogisticsReadiness({ context: ctx, pack: p, findings: findingsAck }),
    ).toBe("NOT_READY");

    const pRisk = pack({
      id: "p2",
      missionId: "m1",
      status: "INACTIVE",
      acknowledgements: [
        {
          id: "a2",
          issueKey: issue,
          issueType: "NO_PACK",
          title: "Logistics required but no active pack",
          disposition: "ACCEPTED_RISK",
          note: null,
          acceptedRiskReason: "Materials already on site",
          acknowledgedAt: NOW.toISOString(),
          acknowledgedByUserId: "u1",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findingsRisk = evaluateLogisticsFindings({
      context: ctx,
      pack: pRisk,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(
      deriveLogisticsReadiness({
        context: ctx,
        pack: pRisk,
        findings: findingsRisk,
      }),
    ).toBe("READY_WITH_ACCEPTED_RISK");
  });

  it("marks confirmation stale after schedule or travel change", () => {
    const startsAt = "2026-07-20T16:00:00.000Z";
    const endsAt = "2026-07-20T18:00:00.000Z";
    const departure = "2026-07-20T14:00:00.000Z";
    const ctx = context({
      missionId: "m1",
      materialsIndicated: true,
      startsAt: "2026-07-20T17:00:00.000Z",
      endsAt,
      travelPlannedDepartureAt: "2026-07-20T15:00:00.000Z",
    });
    const p = pack({
      id: "p1",
      missionId: "m1",
      scheduleFingerprint: scheduleFingerprint(startsAt, endsAt),
      travelFingerprint: travelFingerprint(departure),
      items: [
        {
          id: "i1",
          sequence: 1,
          category: "OTHER",
          description: "Kit",
          quantityLabel: "1",
          responsibleName: "Alex",
          responsibleUserId: null,
          recipientName: null,
          requiredByAt: null,
          packLocation: null,
          status: "READY",
          criticality: "STANDARD",
          returnRequired: false,
          notes: null,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateLogisticsFindings({
      context: ctx,
      pack: p,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "STALE_AFTER_RESCHEDULE")).toBe(
      true,
    );
    expect(
      findings.some((f) => f.issueType === "STALE_AFTER_TRAVEL_CHANGE"),
    ).toBe(true);
  });

  it("warns on cancelled Mission with active pack and wrong campaign day", () => {
    const ctx = context({
      missionId: "m1",
      materialsIndicated: true,
      isCancelled: true,
      campaignDateKey: "2026-07-21",
    });
    const p = pack({
      id: "p1",
      missionId: "m1",
      campaignDateKey: "2026-07-20",
      status: "ACTIVE",
    });
    const findings = evaluateLogisticsFindings({
      context: ctx,
      pack: p,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(
      findings.some((f) => f.issueType === "CANCELLED_MISSION_ACTIVE_PACK"),
    ).toBe(true);
    expect(findings.some((f) => f.issueType === "WRONG_CAMPAIGN_DAY")).toBe(
      true,
    );
  });

  it("builds workspace without fabricating pack existence", () => {
    const view = buildMissionLogisticsWorkspaceView({
      context: context({ missionId: "m1" }),
      pack: null,
    });
    expect(view.pack.exists).toBe(false);
    expect(view.isolation.startsExecution).toBe(false);
    expect(view.isolation.mutatesMissionLifecycle).toBe(false);
  });

  it("keeps first Mission distinct from primary on the day board", () => {
    const m1 = context({
      missionId: "early",
      startsAt: "2026-07-20T13:00:00.000Z",
      endsAt: "2026-07-20T14:00:00.000Z",
      lifecyclePhase: "PREPARE",
    });
    const m2 = context({
      missionId: "primary",
      startsAt: "2026-07-20T16:00:00.000Z",
      endsAt: "2026-07-20T18:00:00.000Z",
      lifecyclePhase: "EXECUTE",
    });
    const board = buildDayLogisticsBoardView({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      missions: [m2, m1],
      packsByMissionId: new Map(),
    });
    expect(board.missions.find((m) => m.isFirst)?.missionId).toBe("early");
    expect(board.missions.find((m) => m.isPrimary)?.missionId).toBe("primary");
    expect(board.summary.withPackCount).toBe(0);
    expect(board.isolation.launchesCampaignDay).toBe(false);
  });

  it("uses campaign-local today for date range checks", () => {
    const today = campaignDateKey(NOW, TZ);
    expect(assertLogisticsDateInRange(today, NOW, TZ).ok).toBe(true);
  });

  it("validates pack, item, handoff, and acknowledgement payloads", () => {
    expect(
      validateLogisticsPackPatch(
        { label: "HQ Kit", confirmSchedule: true },
        DEFAULT_LOGISTICS_PACK_CONFIG,
      ).ok,
    ).toBe(true);
    expect(
      validateLogisticsItemUpsert(
        {
          description: "Signs",
          category: "SIGNAGE",
          status: "PACKED",
          criticality: "CRITICAL",
        },
        DEFAULT_LOGISTICS_PACK_CONFIG,
      ).ok,
    ).toBe(true);
    expect(
      validateLogisticsHandoffUpsert(
        { fromName: "A", toName: "B", status: "PLANNED" },
        DEFAULT_LOGISTICS_PACK_CONFIG,
      ).ok,
    ).toBe(true);
    expect(
      validateLogisticsAcknowledgement({
        issueKey: "NO_PACK:m1",
        issueType: "NO_PACK",
        title: "Missing pack",
        disposition: "ACKNOWLEDGED",
      }).ok,
    ).toBe(true);
    expect(
      validateLogisticsAcknowledgement({
        issueKey: "NO_PACK:m1",
        issueType: "NO_PACK",
        title: "Missing pack",
        disposition: "ACCEPTED_RISK",
      }).ok,
    ).toBe(false);
    expect(
      validateLogisticsAcknowledgement({
        issueKey: "NO_PACK:m1",
        issueType: "NO_PACK",
        title: "Missing pack",
        disposition: "ACCEPTED_RISK",
        acceptedRiskReason: "Already staged",
      }).ok,
    ).toBe(true);
  });

  it("tracks return-required outstanding status", () => {
    const ctx = context({ missionId: "m1", materialsIndicated: true });
    const p = pack({
      id: "p1",
      missionId: "m1",
      items: [
        {
          id: "i1",
          sequence: 1,
          category: "TECHNOLOGY",
          description: "Camera",
          quantityLabel: "1",
          responsibleName: "Alex",
          responsibleUserId: null,
          recipientName: null,
          requiredByAt: null,
          packLocation: null,
          status: "USED",
          criticality: "STANDARD",
          returnRequired: true,
          notes: null,
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findings = evaluateLogisticsFindings({
      context: ctx,
      pack: p,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    expect(findings.some((f) => f.issueType === "RETURN_OUTSTANDING")).toBe(
      true,
    );
  });
});
