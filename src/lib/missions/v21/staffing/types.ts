export type MissionStaffingPlanStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "READY"
  | "READY_WITH_RISK"
  | "WRAP_PENDING"
  | "CLOSED";

export type MissionStaffingAssignmentStatus =
  | "PROPOSED"
  | "ASSIGNED"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "RELEASED"
  | "NO_SHOW";

export type MissionStaffingAssignmentTargetType =
  | "CAMPAIGN_USER"
  | "LOCAL_PERSON"
  | "MANUAL_SCOPED"
  | "CONFIRMED_EXTERNAL_REF";

export type MissionStaffingAcknowledgementDisposition =
  | "ACKNOWLEDGED"
  | "ACCEPTED_RISK"
  | "RESOLVED"
  | "NOT_APPLICABLE";

export type StaffingFindingSeverity = "BLOCKER" | "WARNING" | "INFO";

export type StaffingRequirementInput = {
  id: string;
  roleKey: string;
  roleLabel: string;
  requiredCount: number;
  minimumCount: number;
  criticality: "CRITICAL" | "STANDARD" | "OPTIONAL";
  requiredByAt: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type StaffingAssignmentInput = {
  id: string;
  requirementId: string;
  status: MissionStaffingAssignmentStatus;
  targetType: MissionStaffingAssignmentTargetType;
  campaignUserId: string | null;
  localPersonId: string | null;
  manualDisplayLabel: string | null;
  confirmedExternalPersonId: string | null;
  mobilizeObservationId: string | null;
};

export type StaffingAcknowledgementInput = {
  issueKey: string;
  disposition: MissionStaffingAcknowledgementDisposition;
};

export type StaffingPlanInput = {
  id: string;
  missionId: string;
  campaignDateKey: string;
  status: MissionStaffingPlanStatus;
  staffingRequired: boolean;
  confirmationFingerprint: string | null;
  confirmedAt: string | null;
  isStale: boolean;
  isActive: boolean;
  requirements: StaffingRequirementInput[];
  assignments: StaffingAssignmentInput[];
  acknowledgements: StaffingAcknowledgementInput[];
};

export type MissionStaffingContext = {
  missionId: string;
  attendTitle: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  isCancelled: boolean;
  scheduleFingerprint: string;
  /** Optional Mobilize signals linked only when assignment has mobilizeObservationId. */
  linkedMobilizeCancellations: Array<{
    assignmentId: string;
    observationId: string;
    statusCategory: string;
  }>;
  /** Other mission assignments for overlap detection (same identity). */
  peerAssignments: Array<{
    missionId: string;
    startsAt: string;
    endsAt: string;
    identityKey: string;
    assignmentId: string;
  }>;
};

export type RequirementCoverage = {
  requirementId: string;
  roleKey: string;
  roleLabel: string;
  criticality: "CRITICAL" | "STANDARD" | "OPTIONAL";
  requiredCount: number;
  minimumCount: number;
  proposed: number;
  assigned: number;
  confirmed: number;
  checkedIn: number;
  cancelled: number;
  declined: number;
  noShow: number;
  remainingGap: number;
  remainingMinimumGap: number;
};

export type StaffingFinding = {
  issueKey: string;
  issueType: string;
  title: string;
  explanation: string;
  severity: StaffingFindingSeverity;
  missionId: string;
  requirementId: string | null;
  disposition: MissionStaffingAcknowledgementDisposition | null;
  clearsForReadiness: boolean;
};

export type MobilizeAvailabilitySignal = {
  observationId: string;
  statusCategory: string;
  remoteStatus: string;
  timeslotId: string | null;
  lastObservedAt: string | null;
  matchStatus: string | null;
  isAssignableExternal: boolean;
  displaySafe: true;
};

export type MissionStaffingWorkspaceView = {
  mission: {
    id: string;
    attendTitle: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    missionStatus: string;
    sourceEventId: string;
  };
  plan: {
    id: string;
    status: MissionStaffingPlanStatus;
    staffingRequired: boolean;
    campaignDateKey: string;
    confirmedAt: string | null;
    isStale: boolean;
    notes: string | null;
    requirements: Array<{
      id: string;
      roleKey: string;
      roleLabel: string;
      requiredCount: number;
      minimumCount: number;
      criticality: "CRITICAL" | "STANDARD" | "OPTIONAL";
      requiredByAt: string | null;
      skillsNote: string | null;
      sortOrder: number;
      isActive: boolean;
    }>;
    assignments: Array<{
      id: string;
      requirementId: string;
      status: MissionStaffingAssignmentStatus;
      targetType: MissionStaffingAssignmentTargetType;
      displayLabel: string;
      hasMobilizeLink: boolean;
      checkedInAt: string | null;
      confirmedAt: string | null;
    }>;
  } | null;
  coverage: RequirementCoverage[];
  findings: StaffingFinding[];
  readiness: "NOT_ASSESSED" | "READY" | "READY_WITH_RISK" | "BLOCKED";
  launchBlockers: StaffingFinding[];
  mobilizeAvailability: {
    observationCount: number;
    totals: {
      signupsRegistered: number;
      signupsConfirmed: number;
      cancellations: number;
      attended: number;
      unknown: number;
    };
    containsPii: false;
    note: string;
  };
  isolation: ReturnType<
    typeof import("@/lib/missions/v21/staffing/labels").assertStaffingIsolation
  >;
  notice: string;
};
