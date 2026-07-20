import type {
  MissionTravelAcknowledgementDisposition,
  MissionTravelIssueType,
  MissionTravelMode,
  MissionTravelPlanStatus,
  MissionTravelReadiness,
  TravelFindingSeverity,
} from "@/lib/missions/v21/travel-movement/types";

export function labelTravelPlanStatus(value: MissionTravelPlanStatus): string {
  switch (value) {
    case "DRAFT":
      return "Draft";
    case "ACTIVE":
      return "Active";
    case "READY":
      return "Ready";
    case "NEEDS_REVIEW":
      return "Needs review";
    case "INACTIVE":
      return "Inactive";
    case "CANCELLED":
      return "Cancelled";
  }
}

export function labelTravelReadiness(value: MissionTravelReadiness): string {
  switch (value) {
    case "NOT_ASSESSED":
      return "Not assessed";
    case "READY":
      return "Ready";
    case "READY_WITH_ACCEPTED_RISK":
      return "Ready with accepted risk";
    case "NOT_READY":
      return "Not ready";
    case "NOT_REQUIRED":
      return "Not required";
  }
}

export function labelTravelMode(value: MissionTravelMode): string {
  switch (value) {
    case "UNSPECIFIED":
      return "Unspecified";
    case "DRIVE":
      return "Drive";
    case "WALK":
      return "Walk";
    case "FLIGHT":
      return "Flight";
    case "OTHER":
      return "Other";
  }
}

export function labelTravelIssueType(value: MissionTravelIssueType): string {
  switch (value) {
    case "NO_PLAN":
      return "No travel plan";
    case "MISSING_DEPARTURE":
      return "Missing departure";
    case "MISSING_DESTINATION":
      return "Missing destination";
    case "MISSING_DRIVER":
      return "Missing driver";
    case "MISSING_VEHICLE":
      return "Missing vehicle";
    case "ARRIVAL_AFTER_MISSION_START":
      return "Arrival after Mission start";
    case "TIME_CONFLICT":
      return "Time conflict";
    case "LEG_INCOMPLETE":
      return "Incomplete leg";
    case "LEG_ORDER":
      return "Leg order";
    case "MOVEMENT_OVERLAP":
      return "Movement overlap";
    case "MISSING_BUFFER":
      return "Missing buffer";
    case "STALE_AFTER_RESCHEDULE":
      return "Stale after reschedule";
    case "CANCELLED_MISSION_ACTIVE_PLAN":
      return "Active plan on cancelled Mission";
    case "CROSS_MIDNIGHT_AMBIGUITY":
      return "Cross-midnight ambiguity";
    case "PREP_INCOMPLETE":
      return "Travel preparation incomplete";
    case "OPERATOR_ADDED":
      return "Operator-added";
  }
}

export function labelDisposition(
  value: MissionTravelAcknowledgementDisposition,
): string {
  switch (value) {
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

export function labelFindingSeverity(value: TravelFindingSeverity): string {
  switch (value) {
    case "BLOCKER":
      return "Blocking";
    case "WARNING":
      return "Needs attention";
    case "INFO":
      return "Review";
  }
}

/** Dispositions that clear a finding for readiness presentation. ACKNOWLEDGED does not. */
export function dispositionClearsForReadiness(
  disposition: MissionTravelAcknowledgementDisposition | null | undefined,
): boolean {
  return (
    disposition === "ACCEPTED_RISK" ||
    disposition === "RESOLVED" ||
    disposition === "NOT_APPLICABLE"
  );
}
