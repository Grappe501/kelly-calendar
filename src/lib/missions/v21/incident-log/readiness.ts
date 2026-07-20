import {
  incidentDispositionClearsForReadiness,
  labelFindingSeverity,
} from "@/lib/missions/v21/incident-log/labels";
import type { IncidentLogConfig } from "@/lib/missions/v21/incident-log/incident-config";
import type {
  IncidentFinding,
  IncidentMissionContext,
  MissionIncidentPersisted,
  MissionIncidentSeverity,
  MissionIncidentStatus,
  MissionIncidentUpdatePersisted,
} from "@/lib/missions/v21/incident-log/types";
import { campaignDateKey } from "@/lib/missions/v21/select-todays-mission";

export const scheduleFingerprint = (startsAt: string, endsAt: string) =>
  `${startsAt}|${endsAt}`;

export const issueKey = (issueType: string, scopeId: string) =>
  `${issueType}:${scopeId}`;

const ACTIVE_STATUSES: MissionIncidentStatus[] = [
  "OPEN",
  "MONITORING",
  "STABILIZED",
];

const HIGH_CRITICAL: MissionIncidentSeverity[] = ["HIGH", "CRITICAL"];

export const isActiveIncident = (incident: MissionIncidentPersisted) =>
  !incident.isArchived && ACTIVE_STATUSES.includes(incident.status);

export const isHighCriticalIncident = (incident: MissionIncidentPersisted) =>
  HIGH_CRITICAL.includes(incident.severity);

export function sortUpdates(
  updates: MissionIncidentUpdatePersisted[],
): MissionIncidentUpdatePersisted[] {
  return [...updates].sort(
    (a, b) =>
      a.occurredAt.localeCompare(b.occurredAt) ||
      a.recordedAt.localeCompare(b.recordedAt) ||
      a.id.localeCompare(b.id),
  );
}

export function deriveIncidentBoardSummary(input: {
  incidents: MissionIncidentPersisted[];
  findingsByIncidentId: Map<string, IncidentFinding[]>;
}) {
  let activeCount = 0;
  let highCriticalCount = 0;
  let archivedCount = 0;
  let blockerCount = 0;
  let warningCount = 0;

  for (const incident of input.incidents) {
    if (incident.isArchived) archivedCount += 1;
    else if (isActiveIncident(incident)) activeCount += 1;
    if (isHighCriticalIncident(incident) && isActiveIncident(incident)) {
      highCriticalCount += 1;
    }
    const findings = input.findingsByIncidentId.get(incident.id) ?? [];
    blockerCount += findings.filter(
      (f) => f.severity === "BLOCKER" && !f.clearsForReadiness,
    ).length;
    warningCount += findings.filter(
      (f) => f.severity === "WARNING" && !f.clearsForReadiness,
    ).length;
  }

  return {
    incidentCount: input.incidents.length,
    activeCount,
    highCriticalCount,
    archivedCount,
    blockerCount,
    warningCount,
  };
}

export function evaluateIncidentFindings(input: {
  context: IncidentMissionContext;
  incident: MissionIncidentPersisted;
  now?: Date;
  config?: IncidentLogConfig;
}): IncidentFinding[] {
  const { context: ctx, incident } = input;
  const findings: IncidentFinding[] = [];
  const push = (
    f: Omit<
      IncidentFinding,
      "disposition" | "clearsForReadiness" | "severityLabel" | "incidentId"
    >,
  ) => {
    const ack = incident.acknowledgements.find(
      (a) => a.issueKey === f.issueKey,
    );
    findings.push({
      ...f,
      incidentId: incident.id,
      severityLabel: labelFindingSeverity(f.severity),
      disposition: ack?.disposition ?? null,
      clearsForReadiness: incidentDispositionClearsForReadiness(
        ack?.disposition,
      ),
    });
  };

  const active = isActiveIncident(incident);
  const highCritical = isHighCriticalIncident(incident);

  if (
    highCritical &&
    active &&
    (incident.status === "OPEN" || incident.status === "MONITORING")
  ) {
    push({
      issueKey: issueKey("OPEN_HIGH_CRITICAL", incident.id),
      issueType: "OPEN_HIGH_CRITICAL",
      title: `High/critical incident open: ${incident.incidentRef}`,
      explanation:
        "A high or critical severity incident remains open or under monitoring.",
      severity: "BLOCKER",
      missionId: ctx.missionId,
    });
  }

  if (
    active &&
    (ctx.executionStatus === "COMPLETED" ||
      ctx.lifecyclePhase === "COMPLETE" ||
      ctx.lifecyclePhase === "CLOSED")
  ) {
    push({
      issueKey: issueKey("EXECUTE_COMPLETED_OPEN", incident.id),
      issueType: "EXECUTE_COMPLETED_OPEN",
      title: "Mission ended with active incident",
      explanation:
        "Execution or the Mission lifecycle has completed while this incident remains active.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  if (incident.status === "STABILIZED" && !incident.isArchived) {
    push({
      issueKey: issueKey("STABILIZED_UNRESOLVED", incident.id),
      issueType: "STABILIZED_UNRESOLVED",
      title: "Incident stabilized but not resolved",
      explanation:
        "The incident is stabilized and still needs explicit resolution or closure.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  if (highCritical && active && !incident.carriedForwardAt) {
    push({
      issueKey: issueKey("CARRY_FORWARD_REQUIRED", incident.id),
      issueType: "CARRY_FORWARD_REQUIRED",
      title: "Carry-forward required for high/critical incident",
      explanation:
        "High or critical active incidents must be flagged and carried into closeout when appropriate.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  if (incident.followUpRequired && !incident.linkedFollowUpActionId) {
    push({
      issueKey: issueKey("FOLLOW_UP_REQUIRED_UNLINKED", incident.id),
      issueType: "FOLLOW_UP_REQUIRED_UNLINKED",
      title: "Follow-up required but not linked",
      explanation:
        "Follow-up is marked required, but no Mission Follow-Up action is linked.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  if (ctx.isCancelled && active) {
    push({
      issueKey: issueKey("CANCELLED_MISSION_ACTIVE", incident.id),
      issueType: "CANCELLED_MISSION_ACTIVE",
      title: "Active incident on cancelled Mission",
      explanation:
        "The Mission is cancelled, but this incident remains active in the log.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  if (
    ctx.closeoutReviewedAt &&
    incident.updatedAt > ctx.closeoutReviewedAt &&
    !incident.isArchived
  ) {
    push({
      issueKey: issueKey("UPDATED_AFTER_CLOSEOUT", incident.id),
      issueType: "UPDATED_AFTER_CLOSEOUT",
      title: "Incident updated after day closeout review",
      explanation:
        "This incident changed after the campaign day closeout was reviewed.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  const startsDate = ctx.startsAt.slice(0, 10);
  const endsDate = ctx.endsAt.slice(0, 10);
  const now = input.now ?? new Date();
  const todayKey = campaignDateKey(now, ctx.timezone);
  if (
    active &&
    (endsDate !== startsDate || ctx.campaignDateKey !== todayKey)
  ) {
    push({
      issueKey: issueKey("OVERNIGHT_ACTIVE", incident.id),
      issueType: "OVERNIGHT_ACTIVE",
      title: "Cross-day or overnight incident still active",
      explanation:
        "This Mission spans campaign midnights or another campaign day while the incident remains active.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  if (
    highCritical &&
    active &&
    !incident.ownerName?.trim() &&
    !incident.ownerUserId
  ) {
    push({
      issueKey: issueKey("MISSING_OWNER", incident.id),
      issueType: "MISSING_OWNER",
      title: "High/critical incident has no owner",
      explanation:
        "High or critical active incidents must identify an accountable owner.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  if (
    (incident.status === "RESOLVED" || incident.status === "CLOSED") &&
    !incident.updates.some(
      (update) => update.updateType === "RESOLUTION" && update.note?.trim(),
    )
  ) {
    push({
      issueKey: issueKey("RESOLUTION_NOTE_MISSING", incident.id),
      issueType: "RESOLUTION_NOTE_MISSING",
      title: "Resolution note missing",
      explanation:
        "Resolved or closed incidents should include a RESOLUTION update note.",
      severity: "WARNING",
      missionId: ctx.missionId,
    });
  }

  return findings.sort((a, b) => a.issueKey.localeCompare(b.issueKey));
}
