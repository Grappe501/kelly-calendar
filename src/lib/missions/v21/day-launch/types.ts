import type { AttentionSeverity } from "@/lib/missions/v21/command-center/types";

export type CampaignDayLaunchStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "REVIEWED"
  | "LAUNCHED";

export type CampaignDayLaunchReadiness =
  | "NOT_ASSESSED"
  | "READY"
  | "READY_WITH_ACCEPTED_RISK"
  | "NOT_READY"
  | "NO_MISSIONS_SCHEDULED";

export type CampaignDayLaunchAcknowledgementType =
  | "OVERNIGHT_CHANGE"
  | "CARRY_FORWARD"
  | "FIRST_MISSION_PREPARATION"
  | "TRAVEL"
  | "SCHEDULE_CONFLICT"
  | "DUE_COMMITMENT"
  | "LEADERSHIP_DECISION"
  | "MATERIALS"
  | "PEOPLE_BRIEF"
  | "ORGANIZATION_BRIEF"
  | "DATA_INTEGRITY"
  | "OPERATOR_ADDED";

export type CampaignDayLaunchSourceType =
  | "PRIOR_DAY_CLOSEOUT"
  | "CARRY_FORWARD_ITEM"
  | "CAMPAIGN_MISSION"
  | "MISSION_PREPARATION"
  | "MISSION_EXECUTION"
  | "MISSION_DEBRIEF"
  | "MISSION_FOLLOW_UP"
  | "EVENT"
  | "COMMAND_CENTER_RULE"
  | "OPERATOR_ADDED";

export type CampaignDayLaunchAcknowledgementStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "ACCEPTED_RISK"
  | "RESOLVED"
  | "NOT_APPLICABLE";

export type OvernightChangeCategory =
  | "SCHEDULE"
  | "LOCATION"
  | "MISSION_ADDED"
  | "MISSION_REMOVED"
  | "PREPARATION"
  | "TRAVEL"
  | "MESSAGE"
  | "FOLLOW_UP"
  | "OWNERSHIP"
  | "DUE_DATE"
  | "BLOCKER"
  | "APPROVAL"
  | "CLOSEOUT"
  | "DATA_INTEGRITY";

export type LaunchCheckState =
  | "COMPLETE"
  | "NEEDS_ATTENTION"
  | "BLOCKING"
  | "NOT_APPLICABLE";

export type DepartureReadinessState =
  | "CONFIRMED"
  | "NEEDS_ATTENTION"
  | "BLOCKING"
  | "NOT_REQUIRED";

export type PreparationLaunchImpact = "USABLE" | "NEEDS_REVIEW" | "BLOCKING_LAUNCH";

export type CampaignDayLaunchAcknowledgementPersisted = {
  id: string;
  acknowledgementType: CampaignDayLaunchAcknowledgementType;
  sourceType: CampaignDayLaunchSourceType;
  sourceRecordId: string | null;
  importKey: string | null;
  missionId: string | null;
  title: string;
  status: CampaignDayLaunchAcknowledgementStatus;
  acknowledgementNote: string | null;
  acceptedRiskReason: string | null;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignDayLaunchReviewPersisted = {
  id: string;
  campaignDateKey: string;
  status: CampaignDayLaunchStatus;
  readinessAssessment: CampaignDayLaunchReadiness;
  launchSummary: string | null;
  overnightChangeNotes: string | null;
  acceptedRiskSummary: string | null;
  internalNotes: string | null;
  startedAt: string | null;
  reviewedAt: string | null;
  launchedAt: string | null;
  startedByUserId: string | null;
  reviewedByUserId: string | null;
  launchedByUserId: string | null;
  updatedAt: string;
  acknowledgements: CampaignDayLaunchAcknowledgementPersisted[];
};

export type EmptyLaunchState = {
  id: null;
  campaignDateKey: string;
  status: "NOT_STARTED";
  readinessAssessment: "NOT_ASSESSED";
  launchSummary: null;
  overnightChangeNotes: null;
  acceptedRiskSummary: null;
  internalNotes: null;
  startedAt: null;
  reviewedAt: null;
  launchedAt: null;
  startedByUserId: null;
  reviewedByUserId: null;
  launchedByUserId: null;
  updatedAt: null;
  acknowledgements: [];
};

export type OvernightChangeItem = {
  id: string;
  category: OvernightChangeCategory;
  categoryLabel: string;
  title: string;
  missionId: string | null;
  missionTitle: string | null;
  previousValue: string | null;
  currentValue: string | null;
  changeAt: string | null;
  severity: AttentionSeverity;
  severityLabel: string;
  href: string | null;
  acknowledgementImportKey: string;
  acknowledgementStatus: CampaignDayLaunchAcknowledgementStatus | null;
};

export type LaunchCarryForwardItem = {
  id: string;
  title: string;
  sourceType: string;
  missionId: string | null;
  missionTitle: string | null;
  ownerLabel: string;
  targetDateKey: string | null;
  status: string;
  sourceStateLabel: string;
  dueBeforeFirstMission: boolean;
  urgent: boolean;
  href: string;
  acknowledgementImportKey: string;
  acknowledgementStatus: CampaignDayLaunchAcknowledgementStatus | null;
};

export type LaunchMissionCard = {
  missionId: string;
  title: string;
  whenLabel: string;
  locationLabel: string | null;
  lifecyclePhase: string;
  operationalStatus: string;
  preparationReadiness: string | null;
  objective: string | null;
  strategicPurpose: string | null;
  keyMessage: string | null;
  successCriteria: string[];
  arrivalTargetLabel: string | null;
  departureLabel: string | null;
  missingDeparture: boolean;
  href: string;
};

export type DepartureReview = {
  missionId: string;
  missionTitle: string;
  destinationLabel: string | null;
  departureLabel: string | null;
  arrivalTargetLabel: string | null;
  durationMinutes: number | null;
  parking: string | null;
  arrivalInstructions: string | null;
  accessibilityNotes: string | null;
  travelRequired: boolean;
  state: DepartureReadinessState;
  stateLabel: string;
  href: string;
};

export type PreparationLaunchReview = {
  missionId: string;
  readiness: string | null;
  impact: PreparationLaunchImpact;
  impactLabel: string;
  strategicPurpose: string | null;
  keyMessage: string | null;
  successCriteriaCount: number;
  peopleCount: number;
  organizationCount: number;
  incompleteTaskCount: number;
  gaps: string[];
  href: string;
};

export type LaunchScheduleItem = {
  id: string;
  title: string;
  explanation: string;
  missionIds: string[];
  severity: AttentionSeverity;
  severityLabel: string;
};

export type LaunchActionItem = {
  id: string;
  title: string;
  missionId: string | null;
  missionTitle: string | null;
  ownerLabel: string;
  dueLabel: string;
  priority: string | null;
  status: string;
  href: string;
};

export type LaunchDecisionItem = {
  id: string;
  label: string;
  explanation: string;
  missionId: string | null;
  missionTitle: string | null;
  requiredPermission: string;
  href: string;
};

export type LaunchBlocker = {
  id: string;
  title: string;
  explanation: string;
  missionId: string | null;
  acknowledgementImportKey: string;
  acknowledgementStatus: CampaignDayLaunchAcknowledgementStatus | null;
  href: string | null;
};

export type LaunchCheck = {
  id: string;
  label: string;
  group: "OVERNIGHT" | "FIRST_MISSION" | "CAMPAIGN";
  state: LaunchCheckState;
  stateLabel: string;
};

export type CampaignDayLaunchReviewViewModel = {
  campaignDate: string;
  dateLabel: string;
  closingHeading: string;
  timezone: string;
  generatedAt: string;
  isToday: boolean;
  isPast: boolean;
  historicalNotice: string | null;

  launchReview: {
    exists: boolean;
    id: string | null;
    status: CampaignDayLaunchStatus;
    statusLabel: string;
    readinessAssessment: CampaignDayLaunchReadiness;
    readinessAssessmentLabel: string;
    derivedReadiness: CampaignDayLaunchReadiness;
    derivedReadinessLabel: string;
    launchSummary: string | null;
    overnightChangeNotes: string | null;
    acceptedRiskSummary: string | null;
    internalNotes: string | null;
    startedAt: string | null;
    reviewedAt: string | null;
    launchedAt: string | null;
    startedByUserId: string | null;
    reviewedByUserId: string | null;
    launchedByUserId: string | null;
    updatedAt: string | null;
    expectedUpdatedAt: string | null;
  };

  priorCloseout: {
    exists: boolean;
    dateKey: string;
    status: string | null;
    statusLabel: string | null;
    tomorrowReadiness: string | null;
    tomorrowReadinessLabel: string | null;
    signedOffAt: string | null;
    signedOffByUserId: string | null;
    summary: string | null;
    carryForwardCount: number;
    href: string;
    baselineLabel: string;
  };

  summary: {
    missionCount: number;
    overnightChangeCount: number;
    urgentCarryForwardCount: number;
    blockingConditionCount: number;
    acceptedRiskCount: number;
    scheduleConflictCount: number;
    dueBeforeLaunchCount: number;
    leadershipDecisionCount: number;
    unacknowledgedCount: number;
    firstMissionTitle: string | null;
    firstMissionTime: string | null;
    firstDepartureTime: string | null;
    primaryMissionTitle: string | null;
  };

  primaryMission: LaunchMissionCard | null;
  firstMission: LaunchMissionCard | null;
  overnightChanges: OvernightChangeItem[];
  carryForwardItems: LaunchCarryForwardItem[];
  urgentCarryForward: LaunchCarryForwardItem[];
  departureReview: DepartureReview | null;
  preparationReview: PreparationLaunchReview | null;
  scheduleReview: LaunchScheduleItem[];
  dueBeforeLaunch: LaunchActionItem[];
  leadershipDecisions: LaunchDecisionItem[];
  peopleReadiness: { briefedCount: number; missingContextCount: number; label: string };
  organizationReadiness: { briefedCount: number; missingOutcomeCount: number; label: string };
  materialsReadiness: {
    incompleteTaskCount: number;
    state: "CONFIRMED_READY" | "INCOMPLETE" | "NOT_REVIEWED" | "NOT_APPLICABLE";
    stateLabel: string;
  };
  blockingConditions: LaunchBlocker[];
  exceptionDigest: {
    href: string;
    qualifiedCount: number;
    overnightCount: number;
    carryForwardCount: number;
    highCriticalCount: number;
  };
  acceptedRisks: Array<{
    id: string;
    title: string;
    reason: string;
    acknowledgedByUserId: string | null;
    acknowledgedAt: string | null;
  }>;
  acknowledgements: Array<{
    id: string;
    title: string;
    typeLabel: string;
    status: CampaignDayLaunchAcknowledgementStatus;
    statusLabel: string;
  }>;
  checklist: LaunchCheck[];
  reviewBlockers: string[];
  launchBlockers: string[];
  integrityWarnings: string[];

  navigation: {
    briefingHref: string;
    closeoutHref: string;
    todaysMissionHref: string;
    commandCenterHref: string;
    exceptionsHref: string;
    incidentsHref: string;
    reportHref: string;
    todayHref: string;
    previousHref: string | null;
    nextHref: string | null;
  };

  isolation: {
    mutatesMissionRecords: false;
    mutatesEventSchedule: false;
    launchStartsExecution: false;
  };
};
