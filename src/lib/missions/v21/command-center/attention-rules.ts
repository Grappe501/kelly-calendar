import type { MissionCommandCenterConfig } from "@/lib/missions/v21/command-center/config";
import {
  labelAttentionReason,
  labelAttentionSeverity,
} from "@/lib/missions/v21/command-center/labels";
import {
  formatRelativeAge,
  hoursBetween,
  isDueBeforeCampaignDay,
  minutesBetween,
  startsWithinPrepareRiskWindow,
} from "@/lib/missions/v21/command-center/time-windows";
import type {
  AttentionSeverity,
  CommandCenterMissionSnapshot,
  MissionAttentionItem,
  MissionAttentionReason,
  MissionExecutionExceptionItem,
} from "@/lib/missions/v21/command-center/types";
import { labelMissionLifecyclePhase } from "@/lib/missions/v21/labels";

const OPEN_ACTION = new Set(["OPEN", "IN_PROGRESS", "WAITING", "BLOCKED"]);

function item(input: {
  mission: CommandCenterMissionSnapshot;
  reason: MissionAttentionReason;
  severity: AttentionSeverity;
  explanation: string;
  href: string;
  primaryActionLabel: string;
  relevantAt: string | null;
  timeContext: string | null;
}): MissionAttentionItem {
  return {
    id: `${input.mission.missionId}:${input.reason}`,
    missionId: input.mission.missionId,
    missionTitle: input.mission.title,
    reason: input.reason,
    severity: input.severity,
    severityLabel: labelAttentionSeverity(input.severity),
    label: labelAttentionReason(input.reason),
    explanation: input.explanation,
    phase: input.mission.lifecyclePhase,
    phaseLabel: labelMissionLifecyclePhase(input.mission.lifecyclePhase),
    timeContext: input.timeContext,
    href: input.href,
    primaryActionLabel: input.primaryActionLabel,
    relevantAt: input.relevantAt,
    rank: 0,
  };
}

function isUnresolved(status: string): boolean {
  return OPEN_ACTION.has(status);
}

/**
 * Deterministic attention detection. Every reason maps to a documented rule.
 */
export function detectMissionAttention(
  mission: CommandCenterMissionSnapshot,
  now: Date,
  config: MissionCommandCenterConfig,
  campaignTimezone: string,
): MissionAttentionItem[] {
  const out: MissionAttentionItem[] = [];
  const base = `/system/missions/${mission.missionId}`;
  const start = new Date(mission.startsAt);
  const end = new Date(mission.endsAt);

  // Integrity
  if (
    mission.followUp.exists &&
    mission.followUp.status !== "NOT_STARTED" &&
    mission.debrief.status !== "APPROVED"
  ) {
    out.push(
      item({
        mission,
        reason: "RECORD_INTEGRITY_REVIEW",
        severity: "NORMAL",
        explanation:
          "Follow-up workspace exists without an approved Debrief. Open the Mission record to review.",
        href: base,
        primaryActionLabel: "Open Mission Record",
        relevantAt: mission.followUp.closedAt ?? mission.startsAt,
        timeContext: null,
      }),
    );
  }

  if (
    mission.debrief.status === "APPROVED" &&
    !mission.execution.exists
  ) {
    out.push(
      item({
        mission,
        reason: "RECORD_INTEGRITY_REVIEW",
        severity: "NORMAL",
        explanation:
          "Debrief is approved but no execution record exists. Open the Mission record to review.",
        href: base,
        primaryActionLabel: "Open Mission Record",
        relevantAt: mission.debrief.approvedAt,
        timeContext: null,
      }),
    );
  }

  // Execution not started after grace
  if (mission.lifecyclePhase === "EXECUTE") {
    const gracePassed =
      minutesBetween(start, now) >= config.executeNotStartedGraceMinutes;
    const notStarted =
      !mission.execution.exists ||
      mission.execution.status === "NOT_STARTED" ||
      mission.execution.status == null;
    if (gracePassed && notStarted) {
      out.push(
        item({
          mission,
          reason: "EXECUTION_NOT_STARTED",
          severity: "CRITICAL",
          explanation:
            "This Mission is in Execute, but active execution has not begun after the configured grace period.",
          href: `${base}/execute`,
          primaryActionLabel: "Open Execute Mode",
          relevantAt: mission.startsAt,
          timeContext: `Scheduled start plus ${config.executeNotStartedGraceMinutes} minute grace has passed`,
        }),
      );
    }

    if (
      mission.execution.status === "ARRIVED" &&
      mission.execution.arrivedAt &&
      minutesBetween(new Date(mission.execution.arrivedAt), now) >=
        config.arrivedNotStartedWarningMinutes &&
      !mission.execution.startedAt
    ) {
      out.push(
        item({
          mission,
          reason: "ARRIVED_NOT_BEGUN",
          severity: "HIGH",
          explanation:
            "Arrival was recorded, but the Mission has not been marked as started.",
          href: `${base}/execute`,
          primaryActionLabel: "Open Execute Mode",
          relevantAt: mission.execution.arrivedAt,
          timeContext: `Arrived ${formatRelativeAge(mission.execution.arrivedAt, now)} ago`,
        }),
      );
    }

    if (
      mission.execution.status === "IN_PROGRESS" &&
      minutesBetween(end, now) >= config.executionOverrunWarningMinutes
    ) {
      out.push(
        item({
          mission,
          reason: "EXECUTION_OVERRUN",
          severity: "HIGH",
          explanation: `Mission is still marked in progress ${config.executionOverrunWarningMinutes} minutes after the scheduled end.`,
          href: `${base}/execute`,
          primaryActionLabel: "Open Execute Mode",
          relevantAt: mission.endsAt,
          timeContext: `Scheduled end was ${formatRelativeAge(mission.endsAt, now)} ago`,
        }),
      );
    }
  }

  // Preparation risk for upcoming
  if (
    startsWithinPrepareRiskWindow(mission.startsAt, now, config) &&
    mission.lifecyclePhase !== "COMPLETE" &&
    mission.lifecyclePhase !== "EXECUTE"
  ) {
    const readiness = mission.preparation.readiness;
    const notReady =
      !mission.preparation.exists ||
      readiness === "DRAFT" ||
      readiness === "NEEDS_ATTENTION" ||
      readiness == null;
    if (notReady) {
      const hours = Math.max(0, Math.floor(hoursBetween(now, start)));
      out.push(
        item({
          mission,
          reason: "PREPARATION_NOT_READY",
          severity: hours <= 12 ? "CRITICAL" : "HIGH",
          explanation:
            "This Mission begins soon and preparation is not ready for field use.",
          href: `${base}/prepare`,
          primaryActionLabel: "Prepare Mission",
          relevantAt: mission.startsAt,
          timeContext: `Starts in about ${hours} hour${hours === 1 ? "" : "s"}`,
        }),
      );
    }
  }

  // Debrief
  const executionDone =
    mission.execution.status === "COMPLETED" ||
    (mission.lifecyclePhase === "DEBRIEF" &&
      mission.execution.endedAt != null);
  if (executionDone) {
    const debriefAbsent =
      !mission.debrief.exists ||
      mission.debrief.status === "NOT_STARTED" ||
      mission.debrief.status == null;
    if (debriefAbsent && mission.execution.endedAt) {
      const ageHours = hoursBetween(new Date(mission.execution.endedAt), now);
      const threshold = config.debriefExpectedWithinHours;
      const overdue = threshold != null && ageHours >= threshold;
      out.push(
        item({
          mission,
          reason: "DEBRIEF_NOT_STARTED",
          severity: overdue ? "HIGH" : "NORMAL",
          explanation: overdue
            ? `Debrief has not been started after the expected ${threshold}-hour review window.`
            : `Debrief pending for ${Math.floor(ageHours)} hours.`,
          href: `${base}/debrief`,
          primaryActionLabel: "Start Debrief",
          relevantAt: mission.execution.endedAt,
          timeContext: formatRelativeAge(mission.execution.endedAt, now),
        }),
      );
    }

    if (mission.debrief.status === "COMPLETED") {
      out.push(
        item({
          mission,
          reason: "DEBRIEF_AWAITING_APPROVAL",
          severity: "NORMAL",
          explanation:
            "Debrief is completed and waiting for authorized approval.",
          href: `${base}/debrief`,
          primaryActionLabel: "Review for Approval",
          relevantAt: mission.debrief.completedAt,
          timeContext: mission.debrief.completedAt
            ? `Completed ${formatRelativeAge(mission.debrief.completedAt, now)} ago`
            : null,
        }),
      );
    }
  }

  // Follow-up actions
  for (const action of mission.followUp.actions) {
    if (!isUnresolved(action.status)) continue;

    if (
      action.sourceType === "EXECUTE_COMMITMENT" &&
      action.dueAt &&
      isDueBeforeCampaignDay(action.dueAt, now, campaignTimezone)
    ) {
      if (action.priority === "URGENT") {
        out.push(
          item({
            mission,
            reason: "URGENT_COMMITMENT_OVERDUE",
            severity: "CRITICAL",
            explanation: `Urgent commitment is overdue: ${action.title}`,
            href: `${base}/follow-up`,
            primaryActionLabel: "Open Follow-up",
            relevantAt: action.dueAt,
            timeContext: `Due ${action.dueAt.slice(0, 10)}`,
          }),
        );
      } else if (action.priority === "IMPORTANT") {
        out.push(
          item({
            mission,
            reason: "IMPORTANT_COMMITMENT_OVERDUE",
            severity: "HIGH",
            explanation: `Important commitment is overdue: ${action.title}`,
            href: `${base}/follow-up`,
            primaryActionLabel: "Open Follow-up",
            relevantAt: action.dueAt,
            timeContext: `Due ${action.dueAt.slice(0, 10)}`,
          }),
        );
      }
    }

    if (action.status === "BLOCKED") {
      const severity: AttentionSeverity =
        action.priority === "URGENT" ||
        (action.dueAt &&
          isDueBeforeCampaignDay(action.dueAt, now, campaignTimezone))
          ? "CRITICAL"
          : action.priority === "IMPORTANT"
            ? "HIGH"
            : "NORMAL";
      out.push(
        item({
          mission,
          reason: "FOLLOW_UP_BLOCKED",
          severity,
          explanation: action.blockedReason
            ? `Blocked: ${action.blockedReason}`
            : `Follow-up action is blocked: ${action.title}`,
          href: `${base}/follow-up`,
          primaryActionLabel: "Open Follow-up",
          relevantAt: action.dueAt ?? action.nextCheckAt,
          timeContext: action.blockedReason,
        }),
      );
    }

    if (
      action.ownerType === "UNASSIGNED" &&
      (action.priority === "URGENT" || action.priority === "IMPORTANT")
    ) {
      out.push(
        item({
          mission,
          reason: "FOLLOW_UP_UNASSIGNED",
          severity: "HIGH",
          explanation: `Required Follow-up action has no owner: ${action.title}`,
          href: `${base}/follow-up`,
          primaryActionLabel: "Open Follow-up",
          relevantAt: action.dueAt,
          timeContext: null,
        }),
      );
    }

    if (
      action.status === "WAITING" &&
      action.nextCheckAt &&
      new Date(action.nextCheckAt).getTime() <= now.getTime()
    ) {
      out.push(
        item({
          mission,
          reason: "FOLLOW_UP_WAITING_REVIEW",
          severity: "NORMAL",
          explanation: `Waiting work is due for review: ${action.title}`,
          href: `${base}/follow-up`,
          primaryActionLabel: "Open Follow-up",
          relevantAt: action.nextCheckAt,
          timeContext: `Next check was ${formatRelativeAge(action.nextCheckAt, now)} ago`,
        }),
      );
    }
  }

  if (
    mission.followUp.status === "READY_TO_CLOSE" &&
    !mission.followUp.closedAt
  ) {
    out.push(
      item({
        mission,
        reason: "MISSION_READY_TO_CLOSE",
        severity: "HIGH",
        explanation:
          "Follow-up workspace is ready to close, but the Mission remains open.",
        href: `${base}/follow-up`,
        primaryActionLabel: "Review Mission Closeout",
        relevantAt: mission.followUp.completedAt,
        timeContext: null,
      }),
    );
  }

  // Deduplicate by reason (keep first / highest severity already ordered by push order)
  const byReason = new Map<string, MissionAttentionItem>();
  for (const row of out) {
    const key = `${row.missionId}:${row.reason}:${row.explanation}`;
    const existing = byReason.get(key);
    if (!existing) {
      byReason.set(key, row);
      continue;
    }
    const order = { CRITICAL: 0, HIGH: 1, NORMAL: 2 } as const;
    if (order[row.severity] < order[existing.severity]) {
      byReason.set(key, row);
    }
  }
  return [...byReason.values()];
}

export function detectExecutionExceptions(
  mission: CommandCenterMissionSnapshot,
  now: Date,
  config: MissionCommandCenterConfig,
): MissionExecutionExceptionItem[] {
  const out: MissionExecutionExceptionItem[] = [];
  const href = `/system/missions/${mission.missionId}/execute`;
  const start = new Date(mission.startsAt);
  const end = new Date(mission.endsAt);

  if (
    mission.lifecyclePhase === "EXECUTE" &&
    !mission.execution.exists
  ) {
    out.push({
      missionId: mission.missionId,
      title: mission.title,
      label: "Execution has not been started.",
      explanation:
        "Mission phase is Execute, but no execution record exists yet.",
      href,
    });
  }

  if (
    mission.lifecyclePhase === "EXECUTE" &&
    (!mission.execution.exists || mission.execution.status === "NOT_STARTED") &&
    minutesBetween(start, now) >= config.executeNotStartedGraceMinutes
  ) {
    out.push({
      missionId: mission.missionId,
      title: mission.title,
      label: "Execution has not been started.",
      explanation: `Scheduled start plus ${config.executeNotStartedGraceMinutes}-minute grace has passed.`,
      href,
    });
  }

  if (
    mission.execution.status === "ARRIVED" &&
    mission.execution.arrivedAt &&
    !mission.execution.startedAt &&
    minutesBetween(new Date(mission.execution.arrivedAt), now) >=
      config.arrivedNotStartedWarningMinutes
  ) {
    out.push({
      missionId: mission.missionId,
      title: mission.title,
      label: "Arrived, but Mission has not begun.",
      explanation: `Status has remained Arrived for at least ${config.arrivedNotStartedWarningMinutes} minutes.`,
      href,
    });
  }

  if (
    mission.execution.status === "IN_PROGRESS" &&
    minutesBetween(end, now) >= config.executionOverrunWarningMinutes
  ) {
    out.push({
      missionId: mission.missionId,
      title: mission.title,
      label: `Mission is still marked in progress ${config.executionOverrunWarningMinutes} minutes after the scheduled end.`,
      explanation: "Confirm whether field work is continuing or mark execution complete.",
      href,
    });
  }

  if (
    mission.execution.status === "COMPLETED" &&
    mission.execution.observationCount === 0 &&
    mission.execution.commitmentCount === 0 &&
    mission.execution.followUpCount === 0
  ) {
    out.push({
      missionId: mission.missionId,
      title: mission.title,
      label: "Execution ended with no field capture.",
      explanation:
        "No observations, commitments, or immediate follow-ups were recorded.",
      href,
    });
  }

  // Deduplicate identical labels
  const seen = new Set<string>();
  return out.filter((row) => {
    const key = `${row.missionId}:${row.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
