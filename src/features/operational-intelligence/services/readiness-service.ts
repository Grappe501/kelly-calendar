import type {
  EventCompletionResult,
  EventReadinessResult,
  NextBestAction,
  ReadinessBlocker,
  ReadinessLevel,
} from "@/features/operational-intelligence/types/readiness-types";
import type { WorkflowDefinition } from "@/features/operational-intelligence/types/workflow-types";
import { DEFAULT_READINESS_WEIGHTS } from "@/features/operational-intelligence/workflow-definitions/helpers";

export const READINESS_CALCULATION_VERSION = "kccc-readiness-1.0";

export type ReadinessEventInput = {
  id: string;
  version: number;
  eventType?: string | null;
  internalTitle?: string | null;
  campaignDisplayTitle?: string | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  city?: string | null;
  countyId?: string | null;
  venueName?: string | null;
  candidateRole?: string | null;
  candidateAttendance?: string | null;
  defaultVisibility?: string | null;
  historicalOccurredConfirmed?: boolean;
  historicalAttendanceConfirmed?: boolean;
  objectivesCount?: number;
  programFlowCount?: number;
  packingCount?: number;
  packingPackedCount?: number;
  staffAssignedCount?: number;
  staffRequiredCount?: number;
  travelRequired?: boolean;
  travelHasDriver?: boolean;
  travelArrivalOk?: boolean;
  communicationsRequiredCount?: number;
  communicationsReadyCount?: number;
  approvalsPendingCritical?: number;
  complianceApprovalMissing?: boolean;
  followupsScheduled?: number;
  hostContactPresent?: boolean;
};

function levelForScore(score: number, critical: boolean): ReadinessLevel {
  if (critical) {
    if (score >= 90) return "MOSTLY_READY";
    if (score >= 75) return "IN_PROGRESS";
    if (score >= 50) return "AT_RISK";
    if (score >= 20) return "AT_RISK";
    return "NOT_STARTED";
  }
  if (score >= 100) return "COMPLETE";
  if (score >= 90) return "READY";
  if (score >= 75) return "MOSTLY_READY";
  if (score >= 50) return "IN_PROGRESS";
  if (score >= 20) return "AT_RISK";
  return "NOT_STARTED";
}

function domain(
  name: string,
  weight: number,
  completed: number,
  required: number,
  blockers: ReadinessBlocker[] = [],
  warnings: EventReadinessResult["domains"][0]["warnings"] = [],
) {
  const score =
    required === 0 ? 100 : Math.round((Math.min(completed, required) / required) * 100);
  return {
    domain: name,
    score,
    weight,
    status: required === 0 ? "NOT_REQUIRED" : score === 100 ? "COMPLETE" : "INCOMPLETE",
    completedItems: completed,
    requiredItems: required,
    blockers,
    warnings,
  };
}

export function calculateEventReadiness(input: {
  event: ReadinessEventInput;
  workflow?: WorkflowDefinition | null;
  asOf?: Date;
}): EventReadinessResult {
  const event = input.event;
  const weights = input.workflow?.readinessWeights ?? DEFAULT_READINESS_WEIGHTS;
  const criticalBlockers: ReadinessBlocker[] = [];

  const basicRequired = 3;
  const basicCompleted = [
    Boolean(event.campaignDisplayTitle || event.internalTitle),
    Boolean(event.eventType),
    Boolean(event.defaultVisibility),
  ].filter(Boolean).length;

  const timeRequired = 2;
  const timeCompleted = [Boolean(event.startsAt), Boolean(event.endsAt)].filter(Boolean).length;

  const locationRequired = event.eventType?.match(/protected/i) ? 0 : 1;
  const locationCompleted = [Boolean(event.city || event.venueName || event.countyId)].filter(
    Boolean,
  ).length;

  if (event.travelRequired && !event.travelHasDriver) {
    criticalBlockers.push({
      code: "MISSING_DRIVER",
      domain: "Travel",
      message: "Travel required but no driver assigned",
      critical: true,
    });
  }
  if (event.travelRequired && event.travelArrivalOk === false) {
    criticalBlockers.push({
      code: "ARRIVAL_AFTER_START",
      domain: "Travel",
      message: "Travel arrival is after event start",
      critical: true,
    });
  }
  if (event.complianceApprovalMissing) {
    criticalBlockers.push({
      code: "COMPLIANCE_APPROVAL_MISSING",
      domain: "Compliance",
      message: "Fundraiser compliance approval is missing",
      critical: true,
    });
  }
  if (
    event.candidateAttendance &&
    /expected|confirmed/i.test(event.candidateAttendance) &&
    !event.startsAt
  ) {
    criticalBlockers.push({
      code: "CANDIDATE_TIME_MISSING",
      domain: "Date and Time",
      message: "Candidate expected but no confirmed time",
      critical: true,
    });
  }

  const staffRequired = event.staffRequiredCount ?? 0;
  const staffAssigned = event.staffAssignedCount ?? 0;
  const packingRequired = event.packingCount ?? 0;
  const packingPacked = event.packingPackedCount ?? 0;
  const commRequired = event.communicationsRequiredCount ?? 0;
  const commReady = event.communicationsReadyCount ?? 0;

  const domains = [
    domain("Basic Event Details", weights["Basic Event Details"] ?? 8, basicCompleted, basicRequired),
    domain("Date and Time", weights["Date and Time"] ?? 7, timeCompleted, timeRequired),
    domain("Location", weights["Location"] ?? 7, locationCompleted, locationRequired),
    domain(
      "Candidate Role",
      weights["Candidate Role"] ?? 6,
      event.candidateRole ? 1 : 0,
      event.eventType?.match(/protected/i) ? 0 : 1,
    ),
    domain(
      "Host and Contact",
      weights["Host and Contact"] ?? 6,
      event.hostContactPresent ? 1 : 0,
      event.eventType?.match(/festival|fundrais|forum|community/i) ? 1 : 0,
    ),
    domain(
      "Objectives",
      weights["Objectives"] ?? 5,
      (event.objectivesCount ?? 0) > 0 ? 1 : 0,
      event.eventType?.match(/protected|travel block/i) ? 0 : 1,
    ),
    domain(
      "Program Flow",
      weights["Program Flow"] ?? 8,
      (event.programFlowCount ?? 0) > 0 ? 1 : 0,
      event.eventType?.match(/protected|travel block|compliance/i) ? 0 : 1,
    ),
    domain("Staffing", weights["Staffing"] ?? 10, staffAssigned, staffRequired),
    domain(
      "Travel",
      weights["Travel"] ?? 10,
      event.travelRequired ? (event.travelHasDriver ? 1 : 0) : 0,
      event.travelRequired ? 1 : 0,
      criticalBlockers.filter((b) => b.domain === "Travel"),
    ),
    domain("Packing", weights["Packing"] ?? 8, packingPacked, packingRequired),
    domain("Communications", weights["Communications"] ?? 10, commReady, commRequired),
    domain(
      "Approvals",
      weights["Approvals"] ?? 6,
      (event.approvalsPendingCritical ?? 0) === 0 ? 1 : 0,
      (event.approvalsPendingCritical ?? 0) > 0 ? 1 : 0,
    ),
    domain(
      "Compliance",
      weights["Compliance"] ?? 5,
      event.complianceApprovalMissing ? 0 : 1,
      /fundrais|donor/i.test(event.eventType ?? "") ? 1 : 0,
      criticalBlockers.filter((b) => b.domain === "Compliance"),
    ),
    domain("Event-Day Preparation", weights["Event-Day Preparation"] ?? 2, 0, 0),
    domain(
      "Follow-Up Preparation",
      weights["Follow-Up Preparation"] ?? 2,
      (event.followupsScheduled ?? 0) > 0 ? 1 : 0,
      event.eventType?.match(/protected/i) ? 0 : 1,
    ),
  ];

  const active = domains.filter((d) => d.status !== "NOT_REQUIRED");
  const weightSum = active.reduce((s, d) => s + d.weight, 0) || 1;
  let overallScore = Math.round(
    active.reduce((s, d) => s + (d.score * d.weight) / weightSum, 0),
  );
  if (criticalBlockers.length > 0 && overallScore >= 90) {
    overallScore = Math.min(overallScore, 89);
  }

  const nextBestActions: NextBestAction[] = [];
  for (const b of criticalBlockers) {
    nextBestActions.push({
      id: `nba_${b.code}`,
      eventId: event.id,
      title: b.message,
      explanation: `Critical blocker in ${b.domain}`,
      priority: "CRITICAL",
      domain: b.domain,
      actionType: b.code,
      canViewerAct: true,
    });
  }
  if (!event.city && locationRequired) {
    nextBestActions.push({
      id: "nba_confirm_venue_city",
      eventId: event.id,
      title: "Confirm venue / city",
      explanation: "Location is required for travel and staff coordination.",
      priority: "HIGH",
      domain: "Location",
      actionType: "REQUEST_INFORMATION",
      canViewerAct: true,
    });
  }
  if (staffRequired > staffAssigned) {
    nextBestActions.push({
      id: "nba_assign_roles",
      eventId: event.id,
      title: "Assign required staff roles",
      explanation: `${staffRequired - staffAssigned} required role(s) unassigned`,
      priority: "HIGH",
      domain: "Staffing",
      actionType: "ASSIGN_STAFF",
      canViewerAct: true,
    });
  }

  return {
    eventId: event.id,
    calculatedAt: (input.asOf ?? new Date()).toISOString(),
    overallScore,
    readinessLevel: levelForScore(overallScore, criticalBlockers.length > 0),
    domains,
    criticalBlockers,
    nextBestActions,
    eventVersion: event.version,
    calculationVersion: READINESS_CALCULATION_VERSION,
  };
}

export function calculateEventCompletion(input: {
  event: ReadinessEventInput & {
    followupsComplete?: number;
    followupsTotal?: number;
    materialsReturned?: number;
    materialsOutstanding?: number;
    commitmentsOpen?: number;
  };
}): EventCompletionResult {
  const e = input.event;
  const domains = [
    {
      domain: "Event occurred",
      score: e.historicalOccurredConfirmed ? 100 : 0,
      missingItems: e.historicalOccurredConfirmed ? [] : ["Confirm event occurred"],
    },
    {
      domain: "Candidate attendance",
      score: e.historicalAttendanceConfirmed ? 100 : 0,
      missingItems: e.historicalAttendanceConfirmed
        ? []
        : ["Confirm candidate attendance separately from import"],
    },
    {
      domain: "Follow-up",
      score:
        (e.followupsTotal ?? 0) === 0
          ? 100
          : Math.round(((e.followupsComplete ?? 0) / (e.followupsTotal ?? 1)) * 100),
      missingItems: [],
    },
    {
      domain: "Materials",
      score:
        (e.materialsOutstanding ?? 0) === 0
          ? 100
          : Math.round(
              ((e.materialsReturned ?? 0) /
                Math.max(1, (e.materialsReturned ?? 0) + (e.materialsOutstanding ?? 0))) *
                100,
            ),
      missingItems:
        (e.materialsOutstanding ?? 0) > 0 ? ["Reconcile unreturned materials"] : [],
    },
  ];
  const completionScore = Math.round(
    domains.reduce((s, d) => s + d.score, 0) / domains.length,
  );
  let completionLevel: EventCompletionResult["completionLevel"] = "NOT_STARTED";
  if (e.historicalOccurredConfirmed && completionScore >= 95) completionLevel = "FULLY_CLOSED";
  else if (e.historicalOccurredConfirmed && completionScore >= 60)
    completionLevel = "FOLLOWUP_IN_PROGRESS";
  else if (e.historicalOccurredConfirmed) completionLevel = "EVENT_COMPLETE";

  return {
    eventId: e.id,
    completionScore,
    completionLevel,
    occurredConfirmed: Boolean(e.historicalOccurredConfirmed),
    candidateAttendanceConfirmed: Boolean(e.historicalAttendanceConfirmed),
    domains,
    unresolvedCommitments: e.commitmentsOpen ?? 0,
    overdueFollowups: Math.max(
      0,
      (e.followupsTotal ?? 0) - (e.followupsComplete ?? 0),
    ),
    unreturnedMaterials: e.materialsOutstanding ?? 0,
  };
}
