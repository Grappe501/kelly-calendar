import type { AttentionSeverity, MissionAttentionReason } from "@/lib/missions/v21/command-center/types";

export function labelAttentionSeverity(severity: AttentionSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "Immediate";
    case "HIGH":
      return "Needs attention";
    case "NORMAL":
      return "Review";
    default:
      return severity;
  }
}

export function labelAttentionReason(reason: MissionAttentionReason): string {
  switch (reason) {
    case "EXECUTION_NOT_STARTED":
      return "Execution has not been started";
    case "EXECUTION_OVERRUN":
      return "Mission still marked in progress after scheduled end";
    case "ARRIVED_NOT_BEGUN":
      return "Arrived but Mission has not begun";
    case "PREPARATION_NOT_READY":
      return "Preparation needs attention before start";
    case "DEBRIEF_NOT_STARTED":
      return "Debrief has not been started";
    case "DEBRIEF_AWAITING_APPROVAL":
      return "Debrief awaiting approval";
    case "URGENT_COMMITMENT_OVERDUE":
      return "Urgent commitment overdue";
    case "IMPORTANT_COMMITMENT_OVERDUE":
      return "Important commitment overdue";
    case "FOLLOW_UP_BLOCKED":
      return "Follow-up action blocked";
    case "FOLLOW_UP_UNASSIGNED":
      return "Required Follow-up action unassigned";
    case "FOLLOW_UP_WAITING_REVIEW":
      return "Waiting Follow-up due for review";
    case "MISSION_READY_TO_CLOSE":
      return "Mission ready to close";
    case "RECORD_INTEGRITY_REVIEW":
      return "Record review needed";
    default:
      return reason;
  }
}

export function abbreviateText(value: string | null | undefined, max = 96): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
