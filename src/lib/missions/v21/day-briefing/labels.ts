import type {
  CampaignDayBriefingStatus,
  CampaignDayEndOfDayStatus,
  CampaignDayRiskCategory,
  CampaignDayTimelineEntryType,
} from "@/lib/missions/v21/day-briefing/types";
import { labelAttentionSeverity } from "@/lib/missions/v21/command-center/labels";

export { labelAttentionSeverity };

export function labelBriefingStatus(status: CampaignDayBriefingStatus): string {
  switch (status) {
    case "READY_TO_REVIEW":
      return "Ready to review";
    case "NEEDS_PREPARATION":
      return "Needs preparation";
    case "ACTIVE_DAY":
      return "Active day";
    case "DAY_COMPLETE":
      return "Day complete";
    case "NO_SCHEDULED_MISSIONS":
      return "No scheduled Missions";
    default:
      return status;
  }
}

export function labelEndOfDayStatus(status: CampaignDayEndOfDayStatus): string {
  switch (status) {
    case "CLEAR":
      return "Clear";
    case "WORK_REMAINS":
      return "Work remains";
    case "LEADERSHIP_REVIEW_REMAINS":
      return "Leadership review remains";
    case "ACTIVE_EXECUTION_REMAINS":
      return "Active execution remains";
    default:
      return status;
  }
}

export function labelTimelineType(type: CampaignDayTimelineEntryType): string {
  switch (type) {
    case "DEPARTURE":
      return "Travel";
    case "ARRIVAL_TARGET":
      return "Travel";
    case "MISSION_START":
      return "Mission";
    case "MISSION_END":
      return "Mission";
    case "PREPARATION_DUE":
      return "Preparation";
    case "FOLLOW_UP_DUE":
      return "Follow-up";
    case "APPROVAL_REQUIRED":
      return "Approval";
    case "INTERNAL":
      return "Internal";
    default:
      return type;
  }
}

export function labelRiskCategory(category: CampaignDayRiskCategory): string {
  switch (category) {
    case "SCHEDULE":
      return "Schedule";
    case "TRAVEL":
      return "Travel";
    case "PREPARATION":
      return "Preparation";
    case "EXECUTION":
      return "Execution";
    case "DEBRIEF":
      return "Debrief";
    case "FOLLOW_UP":
      return "Follow-up";
    case "COMMITMENT":
      return "Commitment";
    case "APPROVAL":
      return "Approval";
    case "DATA_INTEGRITY":
      return "Record review";
    default:
      return category;
  }
}
