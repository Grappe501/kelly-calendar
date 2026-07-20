import type { MissionExecutionStatus } from "@/lib/missions/v21/execution/types";

const ALLOWED: Record<MissionExecutionStatus, MissionExecutionStatus[]> = {
  NOT_STARTED: ["NOT_STARTED", "ARRIVED"],
  ARRIVED: ["ARRIVED", "IN_PROGRESS", "NOT_STARTED"],
  IN_PROGRESS: ["IN_PROGRESS", "COMPLETED", "ARRIVED"],
  COMPLETED: ["COMPLETED", "IN_PROGRESS"],
};

export function canTransitionExecution(
  from: MissionExecutionStatus,
  to: MissionExecutionStatus,
): boolean {
  return ALLOWED[from].includes(to);
}
