import type {
  CriterionAssessmentValue,
  LessonCategory,
  MissionDebriefStatus,
  MissionOutcomeAssessment,
  OrganizationResultValue,
  RelationshipOutcomeValue,
} from "@/lib/missions/v21/debrief/types";

export function labelDebriefStatus(status: MissionDebriefStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "APPROVED":
      return "Approved";
    default:
      return status;
  }
}

export function labelOutcomeAssessment(
  value: MissionOutcomeAssessment,
): string {
  switch (value) {
    case "NOT_ASSESSED":
      return "Not yet assessed";
    case "ACHIEVED":
      return "Achieved";
    case "PARTIALLY_ACHIEVED":
      return "Partially achieved";
    case "NOT_ACHIEVED":
      return "Not achieved";
    case "INCONCLUSIVE":
      return "Inconclusive";
    default:
      return value;
  }
}

export function labelCriterionAssessment(
  value: CriterionAssessmentValue,
): string {
  switch (value) {
    case "MET":
      return "Met";
    case "PARTIALLY_MET":
      return "Partially met";
    case "NOT_MET":
      return "Not met";
    case "UNKNOWN":
      return "Unknown";
    default:
      return value;
  }
}

export function labelRelationshipOutcome(
  value: RelationshipOutcomeValue,
): string {
  switch (value) {
    case "STRENGTHENED":
      return "Strengthened";
    case "UNCHANGED":
      return "Unchanged";
    case "UNCLEAR":
      return "Unclear";
    case "NEEDS_REPAIR":
      return "Needs repair";
    case "NEW_RELATIONSHIP":
      return "New relationship";
    case "NOT_CONTACTED":
      return "Not contacted";
    default:
      return value;
  }
}

export function labelOrganizationResult(value: OrganizationResultValue): string {
  switch (value) {
    case "ENGAGED":
      return "Engaged";
    case "PARTIAL_ENGAGEMENT":
      return "Partial engagement";
    case "NOT_ENGAGED":
      return "Not engaged";
    case "FOLLOW_UP_NEEDED":
      return "Follow-up needed";
    case "OUTCOME_UNCLEAR":
      return "Outcome unclear";
    default:
      return value;
  }
}

export function labelLessonCategory(value: LessonCategory): string {
  switch (value) {
    case "MESSAGE":
      return "Message";
    case "RELATIONSHIP":
      return "Relationship";
    case "LOGISTICS":
      return "Logistics";
    case "EVENT_FORMAT":
      return "Event format";
    case "FIELD_OPERATIONS":
      return "Field operations";
    case "MEDIA":
      return "Media";
    case "TRAVEL":
      return "Travel";
    case "PREPARATION":
      return "Preparation";
    case "FOLLOW_UP":
      return "Follow-up";
    case "OTHER":
      return "Other";
    default:
      return value;
  }
}

/** Presentation summary — derived, never silently mutates persisted status. */
export function labelDebriefPresentationSummary(
  status: MissionDebriefStatus,
  readyForApproval: boolean,
): string {
  if (status === "APPROVED") return "Approved";
  if (status === "COMPLETED" || readyForApproval) return "Ready for Approval";
  return "In Progress";
}
