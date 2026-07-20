import type {
  MissionStaffingAcknowledgementDisposition,
  MissionStaffingAssignmentStatus,
  MissionStaffingPlanStatus,
  StaffingFindingSeverity,
} from "@/lib/missions/v21/staffing/types";

const words = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

export const labelStaffingPlanStatus = (value: MissionStaffingPlanStatus) =>
  words(value);

export const labelStaffingAssignmentStatus = (
  value: MissionStaffingAssignmentStatus,
) => words(value);

export const labelStaffingDisposition = (
  value: MissionStaffingAcknowledgementDisposition,
) => words(value);

export const labelStaffingReadiness = (
  value: "NOT_ASSESSED" | "READY" | "READY_WITH_RISK" | "BLOCKED",
) => words(value);

export const labelStaffingCriticality = (
  value: "CRITICAL" | "STANDARD" | "OPTIONAL",
) => words(value);

export function labelStaffingFindingSeverity(value: StaffingFindingSeverity) {
  return value === "BLOCKER"
    ? "Blocking"
    : value === "WARNING"
      ? "Needs attention"
      : "Review";
}

/** ACKNOWLEDGED deliberately does not clear blockers/readiness. */
export function staffingDispositionClearsForReadiness(
  disposition: MissionStaffingAcknowledgementDisposition | null | undefined,
): boolean {
  return (
    disposition === "ACCEPTED_RISK" ||
    disposition === "RESOLVED" ||
    disposition === "NOT_APPLICABLE"
  );
}

export function identityKeyForAssignment(input: {
  targetType: string;
  campaignUserId: string | null;
  localPersonId: string | null;
  manualDisplayLabel: string | null;
  confirmedExternalPersonId: string | null;
}): string | null {
  if (input.targetType === "CAMPAIGN_USER" && input.campaignUserId) {
    return `user:${input.campaignUserId}`;
  }
  if (input.targetType === "LOCAL_PERSON" && input.localPersonId) {
    return `person:${input.localPersonId}`;
  }
  if (input.targetType === "MANUAL_SCOPED" && input.manualDisplayLabel) {
    return `manual:${input.manualDisplayLabel.trim().toLowerCase()}`;
  }
  if (
    input.targetType === "CONFIRMED_EXTERNAL_REF" &&
    input.confirmedExternalPersonId
  ) {
    return `ext:${input.confirmedExternalPersonId}`;
  }
  return null;
}

export const ACTIVE_COVERAGE_STATUSES: MissionStaffingAssignmentStatus[] = [
  "PROPOSED",
  "ASSIGNED",
  "CONFIRMED",
  "CHECKED_IN",
];

export const CONFIRMED_LIKE: MissionStaffingAssignmentStatus[] = [
  "CONFIRMED",
  "CHECKED_IN",
];

export function assertStaffingIsolation() {
  return {
    mutatesEvent: false,
    mutatesMission: false,
    mutatesPrepare: false,
    mutatesExecute: false,
    mutatesDebrief: false,
    mutatesFollowUp: false,
    mutatesTravel: false,
    mutatesLogistics: false,
    mutatesFieldOps: false,
    mutatesIncidents: false,
    mutatesExceptionDigest: false,
    mutatesCloseout: false,
    mutatesLaunchReview: false,
    mutatesDayLaunch: false,
    writesMobilizePeople: false,
    writesMobilizeAttendance: false,
    autoAssignsFromRsvp: false,
    autoAssignsFromName: false,
    autoCreatesLocalPerson: false,
    treatsRsvpAsCommitment: false,
    treatsAttendanceAsCheckIn: false,
    treatsCheckInAsExecute: false,
    infersCommunicationConsent: false,
  } as const;
}
