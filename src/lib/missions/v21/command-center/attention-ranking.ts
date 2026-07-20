import type {
  AttentionSeverity,
  MissionAttentionItem,
  MissionAttentionReason,
} from "@/lib/missions/v21/command-center/types";

const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
};

/**
 * Stable reason rank within equal severity (lower = higher priority).
 * Documented order per Deliverable 7 §11.
 */
const REASON_RANK: Record<MissionAttentionReason, number> = {
  EXECUTION_NOT_STARTED: 1,
  URGENT_COMMITMENT_OVERDUE: 2,
  FOLLOW_UP_BLOCKED: 3,
  IMPORTANT_COMMITMENT_OVERDUE: 4,
  PREPARATION_NOT_READY: 5,
  DEBRIEF_NOT_STARTED: 6,
  FOLLOW_UP_UNASSIGNED: 7,
  MISSION_READY_TO_CLOSE: 8,
  DEBRIEF_AWAITING_APPROVAL: 9,
  FOLLOW_UP_WAITING_REVIEW: 10,
  EXECUTION_OVERRUN: 11,
  ARRIVED_NOT_BEGUN: 12,
  RECORD_INTEGRITY_REVIEW: 13,
};

export function compareAttentionItems(
  a: MissionAttentionItem,
  b: MissionAttentionItem,
): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;

  const reason = REASON_RANK[a.reason] - REASON_RANK[b.reason];
  if (reason !== 0) return reason;

  const aTime = a.relevantAt ? new Date(a.relevantAt).getTime() : Number.POSITIVE_INFINITY;
  const bTime = b.relevantAt ? new Date(b.relevantAt).getTime() : Number.POSITIVE_INFINITY;
  if (aTime !== bTime) return aTime - bTime;

  return a.missionId.localeCompare(b.missionId) || a.reason.localeCompare(b.reason);
}

export function rankAttentionItems(
  items: MissionAttentionItem[],
): MissionAttentionItem[] {
  return [...items]
    .sort(compareAttentionItems)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
