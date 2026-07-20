import { incidentDispositionClearsForReadiness } from "@/lib/missions/v21/incident-log/labels";
import {
  evaluateIncidentFindings,
  isActiveIncident,
  isHighCriticalIncident,
} from "@/lib/missions/v21/incident-log/readiness";
import type {
  IncidentFinding,
  IncidentMissionContext,
  MissionIncidentPersisted,
} from "@/lib/missions/v21/incident-log/types";
import type {
  DigestBucket,
  DigestFilter,
  DigestFollowUpLinkState,
  DigestIncidentEntry,
} from "@/lib/missions/v21/exception-digest/types";

function followUpLinkState(
  incident: MissionIncidentPersisted,
): DigestFollowUpLinkState {
  if (!incident.followUpRequired) return "NOT_REQUIRED";
  return incident.linkedFollowUpActionId
    ? "REQUIRED_LINKED"
    : "REQUIRED_UNLINKED";
}

function highestFindingSeverity(
  findings: IncidentFinding[],
): "BLOCKER" | "WARNING" | "INFO" | null {
  if (findings.some((f) => f.severity === "BLOCKER" && !f.clearsForReadiness)) {
    return "BLOCKER";
  }
  if (findings.some((f) => f.severity === "WARNING" && !f.clearsForReadiness)) {
    return "WARNING";
  }
  if (findings.some((f) => f.severity === "INFO")) return "INFO";
  return null;
}

function assignBuckets(input: {
  selectedDateKey: string;
  incident: MissionIncidentPersisted;
  context: IncidentMissionContext | undefined;
  findings: IncidentFinding[];
  digestReviewedAt: string | null;
}): DigestBucket[] {
  const { incident, findings, selectedDateKey, digestReviewedAt } = input;
  const buckets: DigestBucket[] = [];
  const active = isActiveIncident(incident);
  const highCritical = isHighCriticalIncident(incident);

  if (incident.campaignDateKey !== selectedDateKey) {
    buckets.push("ORIGINATED_EARLIER");
  }

  if (
    active &&
    highCritical &&
    (incident.status === "OPEN" || incident.status === "MONITORING")
  ) {
    buckets.push("OPEN_HIGH_CRITICAL");
  } else if (
    active &&
    (incident.status === "OPEN" || incident.status === "MONITORING") &&
    !highCritical
  ) {
    buckets.push("OPEN_LOWER_SEVERITY");
  }

  if (
    active &&
    (incident.status === "MONITORING" || incident.status === "STABILIZED")
  ) {
    buckets.push("MONITORING_STABILIZED");
  }

  if (
    incident.carryForwardRequired ||
    incident.carriedForwardAt ||
    findings.some((f) => f.issueType === "CARRY_FORWARD_REQUIRED")
  ) {
    buckets.push("EXPLICIT_CARRY_FORWARD");
  }

  if (followUpLinkState(incident) === "REQUIRED_UNLINKED") {
    buckets.push("FOLLOW_UP_GAP");
  }

  if (findings.some((f) => f.issueType === "UPDATED_AFTER_CLOSEOUT")) {
    buckets.push("UPDATED_AFTER_CLOSEOUT");
  }

  if (
    digestReviewedAt &&
    incident.updatedAt > digestReviewedAt &&
    !incident.isArchived
  ) {
    buckets.push("UPDATED_AFTER_DIGEST_REVIEW");
  }

  if (findings.some((f) => f.issueType === "OVERNIGHT_ACTIVE")) {
    buckets.push("OVERNIGHT");
  }

  if (findings.some((f) => f.issueType === "CANCELLED_MISSION_ACTIVE")) {
    buckets.push("CANCELLED_MISSION");
  }

  const openHighFinding = findings.find(
    (f) => f.issueType === "OPEN_HIGH_CRITICAL",
  );
  if (
    openHighFinding?.disposition === "ACKNOWLEDGED" &&
    !incidentDispositionClearsForReadiness(openHighFinding.disposition)
  ) {
    buckets.push("ACKNOWLEDGED_BLOCKER");
  }

  if (
    findings.some((f) => f.disposition === "ACCEPTED_RISK") ||
    incident.acknowledgements.some((a) => a.disposition === "ACCEPTED_RISK")
  ) {
    buckets.push("ACCEPTED_RISK");
  }

  if (
    !incident.isArchived &&
    (incident.status === "RESOLVED" || incident.status === "CLOSED") &&
    (incident.resolvedAt?.startsWith(selectedDateKey) ||
      incident.closedAt?.startsWith(selectedDateKey) ||
      incident.campaignDateKey === selectedDateKey)
  ) {
    buckets.push("RESOLVED_DURING_DAY");
  }

  return [...new Set(buckets)];
}

export function buildDigestIncidentEntry(input: {
  selectedDateKey: string;
  incident: MissionIncidentPersisted;
  context: IncidentMissionContext | undefined;
  digestReviewedAt: string | null;
  now?: Date;
}): DigestIncidentEntry | null {
  const { incident, selectedDateKey } = input;
  if (incident.isArchived) return null;

  const context: IncidentMissionContext = input.context ?? {
    missionId: incident.missionId,
    title: "Mission",
    startsAt: `${incident.campaignDateKey}T12:00:00.000Z`,
    endsAt: `${incident.campaignDateKey}T13:00:00.000Z`,
    timezone: "America/Chicago",
    campaignDateKey: incident.campaignDateKey,
    lifecyclePhase: "EXECUTE",
    operationalStatus: "ACTIVE",
    executionStatus: null,
    isCancelled: false,
    closeoutReviewedAt: null,
  };

  const findings = evaluateIncidentFindings({
    context,
    incident,
    now: input.now,
  });

  const buckets = assignBuckets({
    selectedDateKey,
    incident,
    context,
    findings,
    digestReviewedAt: input.digestReviewedAt,
  });

  // Include if it belongs to selected day or is policy-qualified for rollup.
  const belongsToDay = incident.campaignDateKey === selectedDateKey;
  const policyQualified =
    buckets.includes("EXPLICIT_CARRY_FORWARD") ||
    buckets.includes("OVERNIGHT") ||
    buckets.includes("OPEN_HIGH_CRITICAL") ||
    buckets.includes("FOLLOW_UP_GAP") ||
    buckets.includes("CANCELLED_MISSION") ||
    buckets.includes("UPDATED_AFTER_CLOSEOUT") ||
    (isActiveIncident(incident) && incident.campaignDateKey < selectedDateKey);

  if (!belongsToDay && !policyQualified) return null;
  if (buckets.length === 0 && !belongsToDay) return null;

  // Empty day-only resolved quiet incidents still appear under RESOLVED_DURING_DAY;
  // day-origin active with no buckets still get OPEN_* from assignBuckets.
  if (belongsToDay && buckets.length === 0 && !isActiveIncident(incident)) {
    if (
      incident.status !== "RESOLVED" &&
      incident.status !== "CLOSED"
    ) {
      return null;
    }
  }

  const linkState = followUpLinkState(incident);
  const acceptedRiskAck = incident.acknowledgements.find(
    (a) => a.disposition === "ACCEPTED_RISK",
  );
  const acknowledgedUnclearedBlocker = findings.some(
    (f) =>
      f.severity === "BLOCKER" &&
      f.disposition === "ACKNOWLEDGED" &&
      !f.clearsForReadiness,
  );

  return {
    incidentId: incident.id,
    incidentRef: incident.incidentRef,
    missionId: incident.missionId,
    missionTitle: context.title,
    originCampaignDateKey: incident.campaignDateKey,
    sourceDayAttribution:
      incident.campaignDateKey === selectedDateKey
        ? "SELECTED_DAY"
        : "EARLIER_DAY",
    status: incident.status,
    severity: incident.severity,
    category: incident.category,
    sensitivity: incident.sensitivity,
    summary:
      incident.sensitivity === "CONFIDENTIAL" ? "" : incident.summary,
    isConfidentialHidden: incident.sensitivity === "CONFIDENTIAL",
    carryForwardRequired: incident.carryForwardRequired,
    carriedForwardAt: incident.carriedForwardAt,
    followUpLinkState: linkState,
    linkedFollowUpActionId: incident.linkedFollowUpActionId,
    lastPermittedUpdateAt: incident.updatedAt,
    findingIssueKeys: findings.map((f) => f.issueKey),
    buckets,
    highestFindingSeverity: highestFindingSeverity(findings),
    acceptedRisk: Boolean(acceptedRiskAck),
    acknowledgedUnclearedBlocker,
    dispositionNote: acceptedRiskAck?.acceptedRiskReason ?? null,
    href: `/system/missions/${incident.missionId}/incidents/${incident.id}`,
    missionHref: `/system/missions/${incident.missionId}`,
    followUpHref: incident.followUpRequired
      ? `/system/missions/${incident.missionId}/follow-up`
      : null,
  };
}

export function deriveExceptionDigestEntries(input: {
  selectedDateKey: string;
  incidents: MissionIncidentPersisted[];
  contextsByMissionId: Map<string, IncidentMissionContext>;
  digestReviewedAt: string | null;
  now?: Date;
}): DigestIncidentEntry[] {
  const entries: DigestIncidentEntry[] = [];
  for (const incident of input.incidents) {
    const entry = buildDigestIncidentEntry({
      selectedDateKey: input.selectedDateKey,
      incident,
      context: input.contextsByMissionId.get(incident.missionId),
      digestReviewedAt: input.digestReviewedAt,
      now: input.now,
    });
    if (entry) entries.push(entry);
  }
  return entries.sort(
    (a, b) =>
      severitySort(b.severity) - severitySort(a.severity) ||
      a.originCampaignDateKey.localeCompare(b.originCampaignDateKey) ||
      a.incidentRef.localeCompare(b.incidentRef),
  );
}

function severitySort(severity: string): number {
  const rank: Record<string, number> = {
    CRITICAL: 5,
    HIGH: 4,
    MODERATE: 3,
    LOW: 2,
    INFO: 1,
  };
  return rank[severity] ?? 0;
}

/** Tomorrow preview: only explicit carry-forward or otherwise policy-qualified. */
export function selectTomorrowPreviewEntries(
  entries: DigestIncidentEntry[],
): DigestIncidentEntry[] {
  return entries.filter(
    (e) =>
      (e.carryForwardRequired || e.carriedForwardAt) &&
      (e.buckets.includes("OPEN_HIGH_CRITICAL") ||
        e.buckets.includes("OPEN_LOWER_SEVERITY") ||
        e.buckets.includes("MONITORING_STABILIZED") ||
        e.buckets.includes("FOLLOW_UP_GAP") ||
        e.buckets.includes("EXPLICIT_CARRY_FORWARD")),
  );
}

/** Launch-qualified overnight + carried-forward for next-day Launch. */
export function selectLaunchQualifiedEntries(
  entries: DigestIncidentEntry[],
): DigestIncidentEntry[] {
  return entries.filter(
    (e) =>
      e.buckets.includes("OVERNIGHT") ||
      e.buckets.includes("EXPLICIT_CARRY_FORWARD") ||
      e.buckets.includes("OPEN_HIGH_CRITICAL") ||
      e.buckets.includes("FOLLOW_UP_GAP") ||
      e.acknowledgedUnclearedBlocker,
  );
}

export function applyDigestFilters(
  entries: DigestIncidentEntry[],
  filter: DigestFilter | null | undefined,
): DigestIncidentEntry[] {
  if (!filter) return entries;
  return entries.filter((e) => {
    if (filter.missionId && e.missionId !== filter.missionId) return false;
    if (filter.severity && e.severity !== filter.severity) return false;
    if (filter.status && e.status !== filter.status) return false;
    if (filter.category && e.category !== filter.category) return false;
    if (filter.carryForward === "required" && !e.carryForwardRequired) {
      return false;
    }
    if (filter.carryForward === "carried" && !e.carriedForwardAt) return false;
    if (
      filter.carryForward === "none" &&
      (e.carryForwardRequired || e.carriedForwardAt)
    ) {
      return false;
    }
    if (
      filter.followUpState &&
      filter.followUpState !== "any" &&
      e.followUpLinkState !== filter.followUpState
    ) {
      return false;
    }
    return true;
  });
}
