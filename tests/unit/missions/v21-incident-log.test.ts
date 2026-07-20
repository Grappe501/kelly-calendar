import { describe, expect, it } from "vitest";
import {
  assertIncidentDateInRange,
  buildDayIncidentBoardView,
  buildMissionIncidentsWorkspaceView,
  DEFAULT_INCIDENT_LOG_CONFIG,
  EMERGENCY_NOTICE,
  evaluateIncidentFindings,
  incidentDispositionClearsForReadiness,
  incidentIssueKey as issueKey,
  isActiveIncident,
  redactForBoard,
  sortIncidentUpdates,
  validateIncidentAcknowledgement,
  validateIncidentCreate,
  type IncidentMissionContext,
  type MissionIncidentPersisted,
} from "@/lib/missions/v21/incident-log";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";

const TZ = "America/Chicago";
const NOW = new Date("2026-07-20T14:00:00.000Z");

function context(
  overrides: Partial<IncidentMissionContext> & { missionId: string },
): IncidentMissionContext {
  return {
    missionId: overrides.missionId,
    title: overrides.title ?? `Mission ${overrides.missionId}`,
    startsAt: overrides.startsAt ?? "2026-07-20T16:00:00.000Z",
    endsAt: overrides.endsAt ?? "2026-07-20T18:00:00.000Z",
    timezone: TZ,
    campaignDateKey: overrides.campaignDateKey ?? "2026-07-20",
    lifecyclePhase: overrides.lifecyclePhase ?? "EXECUTE",
    operationalStatus: overrides.operationalStatus ?? "READY",
    executionStatus: overrides.executionStatus ?? "IN_PROGRESS",
    isCancelled: overrides.isCancelled ?? false,
    closeoutReviewedAt: overrides.closeoutReviewedAt ?? null,
  };
}

function incident(
  overrides: Partial<MissionIncidentPersisted> & { id: string; missionId: string },
): MissionIncidentPersisted {
  return {
    id: overrides.id,
    missionId: overrides.missionId,
    campaignDateKey: overrides.campaignDateKey ?? "2026-07-20",
    incidentRef: overrides.incidentRef ?? "INC-20260720-abc123",
    category: overrides.category ?? "SAFETY",
    severity: overrides.severity ?? "HIGH",
    status: overrides.status ?? "OPEN",
    summary: overrides.summary ?? "Access delayed at venue",
    description: overrides.description ?? "Doors locked longer than planned.",
    observedAt: overrides.observedAt ?? NOW.toISOString(),
    reportedAt: overrides.reportedAt ?? NOW.toISOString(),
    reportedByUserId: overrides.reportedByUserId ?? "u1",
    locationLabel: overrides.locationLabel ?? "Main entrance",
    sensitivity: overrides.sensitivity ?? "STANDARD",
    immediateActionSummary: overrides.immediateActionSummary ?? null,
    ownerName: overrides.ownerName ?? "Ops Lead",
    ownerUserId: overrides.ownerUserId ?? null,
    carryForwardRequired: overrides.carryForwardRequired ?? false,
    carriedForwardAt: overrides.carriedForwardAt ?? null,
    carriedForwardByUserId: overrides.carriedForwardByUserId ?? null,
    followUpRequired: overrides.followUpRequired ?? false,
    linkedFollowUpActionId: overrides.linkedFollowUpActionId ?? null,
    linkedFollowUpImportKey: overrides.linkedFollowUpImportKey ?? null,
    stabilizedAt: overrides.stabilizedAt ?? null,
    stabilizedByUserId: overrides.stabilizedByUserId ?? null,
    resolvedAt: overrides.resolvedAt ?? null,
    resolvedByUserId: overrides.resolvedByUserId ?? null,
    closedAt: overrides.closedAt ?? null,
    closedByUserId: overrides.closedByUserId ?? null,
    archivedAt: overrides.archivedAt ?? null,
    archivedByUserId: overrides.archivedByUserId ?? null,
    isArchived: overrides.isArchived ?? false,
    createdByUserId: overrides.createdByUserId ?? "u1",
    updatedByUserId: overrides.updatedByUserId ?? "u1",
    createdAt: overrides.createdAt ?? NOW.toISOString(),
    updatedAt: overrides.updatedAt ?? NOW.toISOString(),
    updates: overrides.updates ?? [],
    acknowledgements: overrides.acknowledgements ?? [],
  };
}

describe("V2.1 Mission Incident Log", () => {
  it("exposes emergency notice and does not fabricate incidents on workspace build", () => {
    expect(EMERGENCY_NOTICE).toMatch(/does not summon assistance/i);
    const view = buildMissionIncidentsWorkspaceView({
      context: context({ missionId: "m1" }),
      incidents: [],
      now: NOW,
    });
    expect(view.incidents).toEqual([]);
    expect(view.isolation.startsExecution).toBe(false);
    expect(view.isolation.mutatesMissionLifecycle).toBe(false);
    expect(view.emergencyNotice).toBe(EMERGENCY_NOTICE);
  });

  it("blocks open high/critical incidents", () => {
    const ctx = context({ missionId: "m1" });
    const inc = incident({ id: "i1", missionId: "m1", severity: "CRITICAL" });
    const findings = evaluateIncidentFindings({
      context: ctx,
      incident: inc,
      config: DEFAULT_INCIDENT_LOG_CONFIG,
      now: NOW,
    });
    expect(findings.some((f) => f.issueType === "OPEN_HIGH_CRITICAL")).toBe(
      true,
    );
  });

  it("does not treat INFO incidents as blockers", () => {
    const ctx = context({ missionId: "m1" });
    const inc = incident({
      id: "i1",
      missionId: "m1",
      severity: "INFO",
      status: "OPEN",
    });
    const findings = evaluateIncidentFindings({
      context: ctx,
      incident: inc,
      config: DEFAULT_INCIDENT_LOG_CONFIG,
      now: NOW,
    });
    expect(findings.some((f) => f.severity === "BLOCKER")).toBe(false);
  });

  it("warns when Execute completed with open incident", () => {
    const ctx = context({
      missionId: "m1",
      executionStatus: "COMPLETED",
    });
    const inc = incident({ id: "i1", missionId: "m1", severity: "MODERATE" });
    const findings = evaluateIncidentFindings({
      context: ctx,
      incident: inc,
      config: DEFAULT_INCIDENT_LOG_CONFIG,
      now: NOW,
    });
    expect(findings.some((f) => f.issueType === "EXECUTE_COMPLETED_OPEN")).toBe(
      true,
    );
  });

  it("warns for follow-up required without link and missing carry-forward", () => {
    const ctx = context({ missionId: "m1" });
    const inc = incident({
      id: "i1",
      missionId: "m1",
      severity: "HIGH",
      followUpRequired: true,
      linkedFollowUpActionId: null,
      carryForwardRequired: false,
      carriedForwardAt: null,
    });
    const findings = evaluateIncidentFindings({
      context: ctx,
      incident: inc,
      config: DEFAULT_INCIDENT_LOG_CONFIG,
      now: NOW,
    });
    expect(
      findings.some((f) => f.issueType === "FOLLOW_UP_REQUIRED_UNLINKED"),
    ).toBe(true);
    expect(
      findings.some((f) => f.issueType === "CARRY_FORWARD_REQUIRED"),
    ).toBe(true);
  });

  it("ACKNOWLEDGED does not clear; ACCEPTED_RISK does", () => {
    expect(incidentDispositionClearsForReadiness("ACKNOWLEDGED")).toBe(false);
    expect(incidentDispositionClearsForReadiness("ACCEPTED_RISK")).toBe(true);
    const ctx = context({ missionId: "m1" });
    const key = issueKey("OPEN_HIGH_CRITICAL", "i1");
    const withAck = incident({
      id: "i1",
      missionId: "m1",
      severity: "CRITICAL",
      acknowledgements: [
        {
          id: "a1",
          issueKey: key,
          issueType: "OPEN_HIGH_CRITICAL",
          title: "Open critical",
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
    const findingsAck = evaluateIncidentFindings({
      context: ctx,
      incident: withAck,
      config: DEFAULT_INCIDENT_LOG_CONFIG,
      now: NOW,
    });
    expect(
      findingsAck.find((f) => f.issueType === "OPEN_HIGH_CRITICAL")
        ?.clearsForReadiness,
    ).toBe(false);

    const withRisk = incident({
      id: "i1",
      missionId: "m1",
      severity: "CRITICAL",
      acknowledgements: [
        {
          id: "a2",
          issueKey: key,
          issueType: "OPEN_HIGH_CRITICAL",
          title: "Open critical",
          disposition: "ACCEPTED_RISK",
          note: null,
          acceptedRiskReason: "Mitigated on site",
          acknowledgedAt: NOW.toISOString(),
          acknowledgedByUserId: "u1",
          createdAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
        },
      ],
    });
    const findingsRisk = evaluateIncidentFindings({
      context: ctx,
      incident: withRisk,
      config: DEFAULT_INCIDENT_LOG_CONFIG,
      now: NOW,
    });
    expect(
      findingsRisk.find((f) => f.issueType === "OPEN_HIGH_CRITICAL")
        ?.clearsForReadiness,
    ).toBe(true);
  });

  it("detects updates after closeout review", () => {
    const ctx = context({
      missionId: "m1",
      closeoutReviewedAt: "2026-07-20T12:00:00.000Z",
    });
    const inc = incident({
      id: "i1",
      missionId: "m1",
      severity: "LOW",
      status: "MONITORING",
      updatedAt: "2026-07-20T15:00:00.000Z",
    });
    const findings = evaluateIncidentFindings({
      context: ctx,
      incident: inc,
      config: DEFAULT_INCIDENT_LOG_CONFIG,
      now: NOW,
    });
    expect(findings.some((f) => f.issueType === "UPDATED_AFTER_CLOSEOUT")).toBe(
      true,
    );
  });

  it("warns on cancelled Mission with active incident", () => {
    const ctx = context({ missionId: "m1", isCancelled: true });
    const inc = incident({ id: "i1", missionId: "m1", status: "OPEN" });
    expect(isActiveIncident(inc)).toBe(true);
    const findings = evaluateIncidentFindings({
      context: ctx,
      incident: inc,
      config: DEFAULT_INCIDENT_LOG_CONFIG,
      now: NOW,
    });
    expect(
      findings.some((f) => f.issueType === "CANCELLED_MISSION_ACTIVE"),
    ).toBe(true);
  });

  it("sorts timeline deterministically", () => {
    const sorted = sortIncidentUpdates([
      {
        id: "u2",
        updateType: "OBSERVATION",
        note: "later",
        actionTaken: null,
        occurredAt: "2026-07-20T11:00:00.000Z",
        recordedAt: "2026-07-20T11:05:00.000Z",
        recordedByUserId: "u1",
        previousStatus: null,
        newStatus: null,
        previousSeverity: null,
        newSeverity: null,
        sensitivity: "STANDARD",
        createdAt: "2026-07-20T11:05:00.000Z",
      },
      {
        id: "u1",
        updateType: "OBSERVATION",
        note: "earlier",
        actionTaken: null,
        occurredAt: "2026-07-20T10:00:00.000Z",
        recordedAt: "2026-07-20T10:05:00.000Z",
        recordedByUserId: "u1",
        previousStatus: null,
        newStatus: null,
        previousSeverity: null,
        newSeverity: null,
        sensitivity: "STANDARD",
        createdAt: "2026-07-20T10:05:00.000Z",
      },
    ]);
    expect(sorted.map((u) => u.id)).toEqual(["u1", "u2"]);
  });

  it("redacts confidential summary on board cards", () => {
    const inc = incident({
      id: "i1",
      missionId: "m1",
      sensitivity: "CONFIDENTIAL",
      summary: "Sensitive detail",
      description: "Secret note",
    });
    const redacted = redactForBoard(inc);
    expect(redacted.summary).not.toContain("Sensitive");
    expect(redacted.description).toBeNull();
    expect(redacted.incidentRef).toBe(inc.incidentRef);
  });

  it("keeps first Mission distinct from primary on day board", () => {
    const early = context({
      missionId: "early",
      startsAt: "2026-07-20T13:00:00.000Z",
      endsAt: "2026-07-20T14:00:00.000Z",
      lifecyclePhase: "PREPARE",
    });
    const primary = context({
      missionId: "primary",
      startsAt: "2026-07-20T16:00:00.000Z",
      endsAt: "2026-07-20T18:00:00.000Z",
      lifecyclePhase: "EXECUTE",
    });
    const board = buildDayIncidentBoardView({
      campaignDate: "2026-07-20",
      now: NOW,
      campaignTimezone: TZ,
      missions: [primary, early],
      incidents: [],
    });
    expect(board.summary.firstMissionTitle).toBe(early.title);
    expect(board.summary.primaryMissionTitle).toBe(primary.title);
    expect(board.isolation.startsExecution).toBe(false);
    expect(board.summary.incidentCount).toBe(0);
  });

  it("validates create and acknowledgement payloads", () => {
    expect(
      validateIncidentCreate(
        {
          category: "ACCESS",
          severity: "HIGH",
          summary: "Door issue",
          observedAt: NOW.toISOString(),
        },
        DEFAULT_INCIDENT_LOG_CONFIG,
      ).ok,
    ).toBe(true);
    expect(
      validateIncidentAcknowledgement({
        issueKey: "OPEN_HIGH_CRITICAL:i1",
        issueType: "OPEN_HIGH_CRITICAL",
        title: "Open",
        disposition: "ACCEPTED_RISK",
      }).ok,
    ).toBe(false);
    expect(
      validateIncidentAcknowledgement({
        issueKey: "OPEN_HIGH_CRITICAL:i1",
        issueType: "OPEN_HIGH_CRITICAL",
        title: "Open",
        disposition: "ACCEPTED_RISK",
        acceptedRiskReason: "Contained",
      }).ok,
    ).toBe(true);
  });

  it("uses campaign-local today for date range", () => {
    const today = campaignDateKey(NOW, TZ);
    expect(assertIncidentDateInRange(today, NOW, TZ).ok).toBe(true);
  });
});
