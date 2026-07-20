import type {
  MissionFollowUpActionStatus,
  MissionFollowUpStatus,
} from "@/lib/missions/v21/follow-up/types";

const WORKSPACE: Record<MissionFollowUpStatus, MissionFollowUpStatus[]> = {
  NOT_STARTED: ["NOT_STARTED", "ACTIVE"],
  ACTIVE: ["ACTIVE", "READY_TO_CLOSE"],
  READY_TO_CLOSE: ["READY_TO_CLOSE", "CLOSED", "ACTIVE"],
  CLOSED: ["CLOSED"],
};

const ACTION: Record<
  MissionFollowUpActionStatus,
  MissionFollowUpActionStatus[]
> = {
  OPEN: ["OPEN", "IN_PROGRESS", "WAITING", "BLOCKED", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: [
    "IN_PROGRESS",
    "WAITING",
    "BLOCKED",
    "COMPLETED",
    "CANCELLED",
  ],
  WAITING: ["WAITING", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"],
  BLOCKED: [
    "BLOCKED",
    "OPEN",
    "IN_PROGRESS",
    "WAITING",
    "COMPLETED",
    "CANCELLED",
  ],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED"],
};

export function canTransitionFollowUpWorkspace(
  from: MissionFollowUpStatus,
  to: MissionFollowUpStatus,
): boolean {
  return WORKSPACE[from].includes(to);
}

export function canTransitionFollowUpAction(
  from: MissionFollowUpActionStatus,
  to: MissionFollowUpActionStatus,
): boolean {
  return ACTION[from].includes(to);
}
