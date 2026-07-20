import type {
  FollowUpPriority,
  MissionExecutionStatus,
  ObservationCategory,
  OrgContactState,
  PersonContactState,
} from "@/lib/missions/v21/execution/types";

export function labelExecutionStatus(status: MissionExecutionStatus): string {
  switch (status) {
    case "ARRIVED":
      return "Arrived";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "NOT_STARTED":
    default:
      return "Not started";
  }
}

export function labelObservationCategory(category: ObservationCategory): string {
  switch (category) {
    case "ISSUE":
      return "Issue";
    case "RELATIONSHIP":
      return "Relationship";
    case "OPPORTUNITY":
      return "Opportunity";
    case "CONCERN":
      return "Concern";
    case "LOGISTICS":
      return "Logistics";
    case "MEDIA":
      return "Media";
    case "GENERAL":
    default:
      return "General";
  }
}

export function labelPersonContactState(state: PersonContactState): string {
  switch (state) {
    case "SPOKE_WITH":
      return "Spoke with";
    case "MISSED":
      return "Missed";
    case "NOT_SEEN":
    default:
      return "Not seen";
  }
}

export function labelOrgContactState(state: OrgContactState): string {
  switch (state) {
    case "ENGAGED":
      return "Engaged";
    case "FOLLOW_UP_NEEDED":
      return "Follow-up needed";
    case "NOT_ENGAGED":
    default:
      return "Not engaged";
  }
}

export function labelFollowUpPriority(priority: FollowUpPriority): string {
  switch (priority) {
    case "IMPORTANT":
      return "Important";
    case "URGENT":
      return "Urgent";
    case "NORMAL":
    default:
      return "Normal";
  }
}
