import type {
  CampaignDayLaunchAcknowledgementStatus,
  CampaignDayLaunchReadiness,
  CampaignDayLaunchStatus,
  DepartureReadinessState,
  LaunchCheckState,
  OvernightChangeCategory,
  PreparationLaunchImpact,
} from "@/lib/missions/v21/day-launch/types";

export function labelLaunchStatus(status: CampaignDayLaunchStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "IN_PROGRESS":
      return "In progress";
    case "REVIEWED":
      return "Reviewed";
    case "LAUNCHED":
      return "Launched";
  }
}

export function labelLaunchReadiness(value: CampaignDayLaunchReadiness): string {
  switch (value) {
    case "NOT_ASSESSED":
      return "Not assessed";
    case "READY":
      return "Ready";
    case "READY_WITH_ACCEPTED_RISK":
      return "Ready with accepted risk";
    case "NOT_READY":
      return "Not ready";
    case "NO_MISSIONS_SCHEDULED":
      return "No Missions scheduled";
  }
}

export function labelAckStatus(
  value: CampaignDayLaunchAcknowledgementStatus,
): string {
  switch (value) {
    case "OPEN":
      return "Open";
    case "ACKNOWLEDGED":
      return "Acknowledged";
    case "ACCEPTED_RISK":
      return "Accepted risk";
    case "RESOLVED":
      return "Resolved";
    case "NOT_APPLICABLE":
      return "Not applicable";
  }
}

export function labelOvernightCategory(value: OvernightChangeCategory): string {
  switch (value) {
    case "SCHEDULE":
      return "Schedule";
    case "LOCATION":
      return "Location";
    case "MISSION_ADDED":
      return "Mission added";
    case "MISSION_REMOVED":
      return "Mission removed";
    case "PREPARATION":
      return "Preparation";
    case "TRAVEL":
      return "Travel";
    case "MESSAGE":
      return "Message";
    case "FOLLOW_UP":
      return "Follow-up";
    case "OWNERSHIP":
      return "Ownership";
    case "DUE_DATE":
      return "Due date";
    case "BLOCKER":
      return "Blocker";
    case "APPROVAL":
      return "Approval";
    case "CLOSEOUT":
      return "Closeout";
    case "DATA_INTEGRITY":
      return "Data integrity";
  }
}

export function labelDepartureState(value: DepartureReadinessState): string {
  switch (value) {
    case "CONFIRMED":
      return "Confirmed";
    case "NEEDS_ATTENTION":
      return "Needs attention";
    case "BLOCKING":
      return "Blocking";
    case "NOT_REQUIRED":
      return "Not required";
  }
}

export function labelPrepImpact(value: PreparationLaunchImpact): string {
  switch (value) {
    case "USABLE":
      return "Usable";
    case "NEEDS_REVIEW":
      return "Needs review";
    case "BLOCKING_LAUNCH":
      return "Blocking launch";
  }
}

export function labelLaunchCheck(value: LaunchCheckState): string {
  switch (value) {
    case "COMPLETE":
      return "Complete";
    case "NEEDS_ATTENTION":
      return "Needs attention";
    case "BLOCKING":
      return "Blocking";
    case "NOT_APPLICABLE":
      return "Not applicable";
  }
}

export function labelSeverity(value: "CRITICAL" | "HIGH" | "NORMAL"): string {
  switch (value) {
    case "CRITICAL":
      return "Immediate";
    case "HIGH":
      return "Needs attention";
    case "NORMAL":
      return "Review";
  }
}
