import type { MissionDebriefStatus } from "@/lib/missions/v21/debrief/types";

const ALLOWED: Record<MissionDebriefStatus, MissionDebriefStatus[]> = {
  NOT_STARTED: ["NOT_STARTED", "IN_PROGRESS"],
  IN_PROGRESS: ["IN_PROGRESS", "COMPLETED"],
  COMPLETED: ["COMPLETED", "APPROVED", "IN_PROGRESS"],
  APPROVED: ["APPROVED"],
};

export function canTransitionDebrief(
  from: MissionDebriefStatus,
  to: MissionDebriefStatus,
): boolean {
  return ALLOWED[from].includes(to);
}
