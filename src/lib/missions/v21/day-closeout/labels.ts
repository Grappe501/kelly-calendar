import type {
  CampaignDayAssessment,
  CampaignDayCarryForwardSourceType,
  CampaignDayCarryForwardStatus,
  CampaignDayCloseoutStatus,
  CloseoutCheckState,
  MissionDayReviewClassification,
  TomorrowReadinessStatus,
} from "@/lib/missions/v21/day-closeout/types";

export function labelCloseoutStatus(status: CampaignDayCloseoutStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "IN_PROGRESS":
      return "In progress";
    case "REVIEWED":
      return "Reviewed";
    case "SIGNED_OFF":
      return "Signed off";
  }
}

export function labelTodayAssessment(value: CampaignDayAssessment): string {
  switch (value) {
    case "NOT_ASSESSED":
      return "Not assessed";
    case "CLEAR":
      return "Clear";
    case "RESPONSIBILITY_REMAINS":
      return "Responsibility remains";
    case "LEADERSHIP_ACTION_REQUIRED":
      return "Leadership action required";
  }
}

export function labelTomorrowReadiness(value: TomorrowReadinessStatus): string {
  switch (value) {
    case "NOT_ASSESSED":
      return "Not assessed";
    case "READY":
      return "Ready";
    case "NEEDS_ATTENTION":
      return "Needs attention";
    case "NOT_READY":
      return "Not ready";
    case "NO_MISSIONS_SCHEDULED":
      return "No Missions scheduled";
  }
}

export function labelCarryForwardSource(
  value: CampaignDayCarryForwardSourceType,
): string {
  switch (value) {
    case "ACTIVE_EXECUTION":
      return "Active execution";
    case "DEBRIEF_REQUIRED":
      return "Debrief required";
    case "DEBRIEF_APPROVAL":
      return "Debrief approval";
    case "FOLLOW_UP_ACTION":
      return "Follow-up action";
    case "COMMITMENT":
      return "Commitment";
    case "BLOCKED_ACTION":
      return "Blocked action";
    case "UNASSIGNED_ACTION":
      return "Unassigned action";
    case "LEADERSHIP_DECISION":
      return "Leadership decision";
    case "TOMORROW_PREPARATION":
      return "Tomorrow preparation";
    case "TOMORROW_TRAVEL":
      return "Tomorrow travel";
    case "TOMORROW_SCHEDULE":
      return "Tomorrow schedule";
    case "DATA_INTEGRITY":
      return "Data integrity";
    case "OPERATOR_ADDED":
      return "Operator added";
  }
}

export function labelCarryForwardStatus(
  value: CampaignDayCarryForwardStatus,
): string {
  switch (value) {
    case "OPEN":
      return "Open";
    case "TRANSFERRED":
      return "Transferred";
    case "RESOLVED":
      return "Resolved";
    case "CANCELLED":
      return "Cancelled";
  }
}

export function labelMissionClassification(
  value: MissionDayReviewClassification,
): string {
  switch (value) {
    case "CAPTURE_COMPLETE":
      return "Capture complete";
    case "ACTION_REQUIRED":
      return "Action required";
    case "LEADERSHIP_REVIEW":
      return "Leadership review";
    case "NO_EXECUTION_EXPECTED":
      return "No execution expected";
    case "RECORD_REVIEW_NEEDED":
      return "Record review needed";
  }
}

export function labelCheckState(value: CloseoutCheckState): string {
  switch (value) {
    case "COMPLETE":
      return "Complete";
    case "NEEDS_ATTENTION":
      return "Needs attention";
    case "NOT_APPLICABLE":
      return "Not applicable";
  }
}
