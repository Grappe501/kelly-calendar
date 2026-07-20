import {
  addDaysToDateKey,
  classifyIncidentDay,
  formatCampaignTime,
  formatFullCampaignDate,
} from "@/lib/missions/v21/incident-log/incident-date";
import {
  EMERGENCY_NOTICE,
  DEFAULT_INCIDENT_LOG_CONFIG,
  type IncidentLogConfig,
} from "@/lib/missions/v21/incident-log/incident-config";
import {
  labelIncidentCategory,
  labelIncidentSensitivity,
  labelIncidentSeverity,
  labelIncidentStatus,
} from "@/lib/missions/v21/incident-log/labels";
import { redactForBoard } from "@/lib/missions/v21/incident-log/privacy";
import {
  deriveIncidentBoardSummary,
  evaluateIncidentFindings,
  isHighCriticalIncident,
  sortUpdates,
} from "@/lib/missions/v21/incident-log/readiness";
import type {
  DayIncidentBoardView,
  IncidentMissionContext,
  MissionIncidentDetailView,
  MissionIncidentPersisted,
  MissionIncidentWorkspaceView,
} from "@/lib/missions/v21/incident-log/types";
import { selectTodaysMission } from "@/lib/missions/v21/select-todays-mission";

function missionHeader(context: IncidentMissionContext) {
  return {
    missionId: context.missionId,
    title: context.title,
    whenLabel: `${formatCampaignTime(context.startsAt, context.timezone, { includeDate: true })} – ${formatCampaignTime(context.endsAt, context.timezone)}`,
    campaignDateKey: context.campaignDateKey,
    lifecyclePhase: context.lifecyclePhase,
    operationalStatus: context.operationalStatus,
    executionStatus: context.executionStatus,
    isCancelled: context.isCancelled,
    href: `/system/missions/${context.missionId}`,
    prepareHref: `/system/missions/${context.missionId}/prepare`,
    executeHref: `/system/missions/${context.missionId}/execute`,
    fieldOpsHref: `/system/missions/${context.missionId}/field-ops`,
    incidentsHref: `/system/missions/${context.missionId}/incidents`,
  };
}

const boundaryMessage =
  "Mission Incident Log records operational exceptions only. It does not start or complete Execute, Field Ops, logistics, travel, launch, or Closeout.";

const isolation = {
  mutatesMissionLifecycle: false as const,
  mutatesExecuteStatus: false as const,
  mutatesFieldOpsStatus: false as const,
  mutatesLogisticsStatus: false as const,
  mutatesTravelStatus: false as const,
  startsExecution: false as const,
};

function findingsForIncident(
  context: IncidentMissionContext,
  incident: MissionIncidentPersisted,
  now?: Date,
  config?: IncidentLogConfig,
) {
  return evaluateIncidentFindings({
    context,
    incident,
    now,
    config,
  });
}

export function buildMissionIncidentsWorkspaceView(input: {
  context: IncidentMissionContext;
  incidents: MissionIncidentPersisted[];
  now?: Date;
  config?: IncidentLogConfig;
}): MissionIncidentWorkspaceView {
  const config = input.config ?? DEFAULT_INCIDENT_LOG_CONFIG;
  const sorted = [...input.incidents].sort(
    (a, b) =>
      b.observedAt.localeCompare(a.observedAt) ||
      a.incidentRef.localeCompare(b.incidentRef),
  );
  const list = sorted.slice(0, config.sectionLimits.missionIncidents).map(
    (incident) => {
      const findings = findingsForIncident(
        input.context,
        incident,
        input.now,
        config,
      );
      return {
        id: incident.id,
        incidentRef: incident.incidentRef,
        category: incident.category,
        categoryLabel: labelIncidentCategory(incident.category),
        severity: incident.severity,
        severityLabel: labelIncidentSeverity(incident.severity),
        status: incident.status,
        statusLabel: labelIncidentStatus(incident.status),
        sensitivity: incident.sensitivity,
        sensitivityLabel: labelIncidentSensitivity(incident.sensitivity),
        summary: incident.summary,
        observedAt: incident.observedAt,
        observedLabel: formatCampaignTime(
          incident.observedAt,
          input.context.timezone,
          { includeDate: true },
        ),
        ownerName: incident.ownerName,
        isArchived: incident.isArchived,
        followUpRequired: incident.followUpRequired,
        carryForwardRequired: incident.carryForwardRequired,
        linkedFollowUpActionId: incident.linkedFollowUpActionId,
        blockerCount: findings.filter(
          (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
        ).length,
        warningCount: findings.filter(
          (f) => f.severity === "WARNING" && !f.clearsForReadiness,
        ).length,
        findings: findings.slice(0, config.sectionLimits.findings),
        href: `/system/missions/${input.context.missionId}/incidents/${incident.id}`,
        expectedUpdatedAt: incident.updatedAt,
      };
    },
  );

  const findingsByIncidentId = new Map(
    sorted.map((incident) => [
      incident.id,
      findingsForIncident(input.context, incident, input.now, config),
    ]),
  );
  const boardSummary = deriveIncidentBoardSummary({
    incidents: sorted,
    findingsByIncidentId,
  });

  return {
    mission: missionHeader(input.context),
    emergencyNotice: EMERGENCY_NOTICE,
    incidents: list,
    summary: {
      totalCount: sorted.length,
      activeCount: boardSummary.activeCount,
      archivedCount: boardSummary.archivedCount,
      highCriticalCount: boardSummary.highCriticalCount,
      blockerCount: boardSummary.blockerCount,
      warningCount: boardSummary.warningCount,
    },
    boundaryMessage,
    isolation,
  };
}

export function buildIncidentDetailView(input: {
  context: IncidentMissionContext;
  incident: MissionIncidentPersisted;
  now?: Date;
  config?: IncidentLogConfig;
}): MissionIncidentDetailView {
  const config = input.config ?? DEFAULT_INCIDENT_LOG_CONFIG;
  const findings = findingsForIncident(
    input.context,
    input.incident,
    input.now,
    config,
  );
  const updates = sortUpdates(input.incident.updates).slice(
    0,
    config.sectionLimits.updates,
  );

  return {
    mission: missionHeader(input.context),
    emergencyNotice: EMERGENCY_NOTICE,
    incident: {
      ...input.incident,
      updates,
    },
    updates,
    acknowledgements: input.incident.acknowledgements,
    findings,
    blockerCount: findings.filter(
      (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
    ).length,
    warningCount: findings.filter(
      (f) => f.severity === "WARNING" && !f.clearsForReadiness,
    ).length,
    expectedUpdatedAt: input.incident.updatedAt,
    boundaryMessage,
    isolation,
  };
}

export function buildDayIncidentBoardView(input: {
  campaignDate: string;
  now: Date;
  campaignTimezone: string;
  missions: IncidentMissionContext[];
  incidents: MissionIncidentPersisted[];
  config?: IncidentLogConfig;
}): DayIncidentBoardView {
  const config = input.config ?? DEFAULT_INCIDENT_LOG_CONFIG;
  const { campaignDate: dateKey, campaignTimezone: tz } = input;
  const day = classifyIncidentDay(dateKey, input.now, tz);
  const contextByMissionId = new Map(
    input.missions.map((mission) => [mission.missionId, mission]),
  );
  const sortedMissions = [...input.missions].sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) ||
      a.missionId.localeCompare(b.missionId),
  );
  const firstId = sortedMissions[0]?.missionId ?? null;
  const primaryId = selectTodaysMission(
    sortedMissions.map((m) => ({
      id: m.missionId,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      lifecyclePhase: m.lifecyclePhase as never,
    })),
    { now: input.now, timezone: tz },
  ).primaryId;

  const findingsByIncidentId = new Map(
    input.incidents.map((incident) => {
      const context =
        contextByMissionId.get(incident.missionId) ??
        ({
          missionId: incident.missionId,
          title: "Mission",
          startsAt: incident.observedAt,
          endsAt: incident.observedAt,
          timezone: tz,
          campaignDateKey: dateKey,
          lifecyclePhase: "UNKNOWN",
          operationalStatus: "UNKNOWN",
          executionStatus: null,
          isCancelled: false,
        } satisfies IncidentMissionContext);
      return [
        incident.id,
        findingsForIncident(context, incident, input.now, config),
      ];
    }),
  );

  const incidents = [...input.incidents]
    .sort(
      (a, b) =>
        b.observedAt.localeCompare(a.observedAt) ||
        a.incidentRef.localeCompare(b.incidentRef),
    )
    .slice(0, config.sectionLimits.dayIncidents)
    .map((incident) => {
      const context = contextByMissionId.get(incident.missionId);
      const redacted = redactForBoard(incident);
      const findings = findingsByIncidentId.get(incident.id) ?? [];
      return {
        incidentId: incident.id,
        incidentRef: incident.incidentRef,
        missionId: incident.missionId,
        missionTitle: context?.title ?? "Mission",
        whenLabel: formatCampaignTime(incident.observedAt, tz, {
          includeDate: false,
        }),
        category: incident.category,
        categoryLabel: labelIncidentCategory(incident.category),
        severity: incident.severity,
        severityLabel: labelIncidentSeverity(incident.severity),
        status: incident.status,
        statusLabel: labelIncidentStatus(incident.status),
        sensitivity: incident.sensitivity,
        summary: redacted.summary || null,
        isArchived: incident.isArchived,
        isHighCritical: isHighCriticalIncident(incident),
        blockerCount: findings.filter(
          (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
        ).length,
        warningCount: findings.filter(
          (f) => f.severity === "WARNING" && !f.clearsForReadiness,
        ).length,
        findings: findings.slice(0, config.sectionLimits.findings),
        href: `/system/missions/${incident.missionId}/incidents/${incident.id}`,
        missionHref: `/system/missions/${incident.missionId}`,
      };
    });

  const boardSummary = deriveIncidentBoardSummary({
    incidents: input.incidents,
    findingsByIncidentId,
  });
  const prev = addDaysToDateKey(dateKey, -1);
  const next = addDaysToDateKey(dateKey, 1);

  return {
    campaignDate: dateKey,
    dateLabel: formatFullCampaignDate(dateKey, tz),
    timezone: tz,
    generatedAt: input.now.toISOString(),
    ...day,
    emergencyNotice: EMERGENCY_NOTICE,
    summary: {
      missionCount: sortedMissions.length,
      incidentCount: boardSummary.incidentCount,
      activeCount: boardSummary.activeCount,
      highCriticalCount: boardSummary.highCriticalCount,
      archivedCount: boardSummary.archivedCount,
      blockerCount: boardSummary.blockerCount,
      warningCount: boardSummary.warningCount,
      firstMissionTitle:
        sortedMissions.find((m) => m.missionId === firstId)?.title ?? null,
      primaryMissionTitle:
        sortedMissions.find((m) => m.missionId === primaryId)?.title ?? null,
    },
    incidents,
    navigation: {
      todayHref: "/system/briefing/incidents",
      briefingHref: `/system/briefing/${dateKey}`,
      launchHref: `/system/briefing/${dateKey}/launch`,
      fieldOpsHref: `/system/briefing/${dateKey}/field-ops`,
      closeoutHref: `/system/briefing/${dateKey}/closeout`,
      commandCenterHref: "/system/missions/command-center",
      todaysMissionHref: "/",
      reportHref: `/system/briefing/${dateKey}/incidents/report`,
      previousHref: `/system/briefing/${prev}/incidents`,
      nextHref: `/system/briefing/${next}/incidents`,
    },
    isolation: {
      mutatesMissionLifecycle: false,
      startsExecution: false,
      launchesCampaignDay: false,
    },
  };
}

export { scheduleFingerprint as incidentScheduleFingerprint } from "@/lib/missions/v21/incident-log/readiness";
