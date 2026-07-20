import type {
  MissionLifecyclePhase,
  MissionOperationalStatus,
} from "@/lib/missions/v21/types";

/**
 * Human labels for V2.1 MissionLifecyclePhase.
 * Do not confuse with legacy Mission Card status (PENDING / IN_PROGRESS / …)
 * in src/lib/missions/mission-status.ts — those systems are not interchangeable.
 */
export function labelMissionLifecyclePhase(
  phase: MissionLifecyclePhase,
): string {
  switch (phase) {
    case "PREPARE":
      return "Prepare";
    case "TRAVEL":
      return "Travel";
    case "EXECUTE":
      return "Execute";
    case "DEBRIEF":
      return "Debrief";
    case "FOLLOW_UP":
      return "Follow-up";
    case "COMPLETE":
      return "Complete";
    default:
      return phase;
  }
}

/**
 * Human labels for V2.1 MissionOperationalStatus.
 * Distinct from lifecycle phase — never merge these enums in UI copy.
 */
export function labelMissionOperationalStatus(
  status: MissionOperationalStatus,
): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PREPARING":
      return "Preparing";
    case "READY":
      return "Ready";
    case "IN_PROGRESS":
      return "In progress";
    case "DEBRIEFING":
      return "Debriefing";
    case "FOLLOW_UP":
      return "Follow-up";
    case "COMPLETE":
      return "Complete";
    case "CANCELLED":
      return "Cancelled";
    case "ARCHIVED":
      return "Archived";
    default:
      return status;
  }
}
