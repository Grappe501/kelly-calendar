export type CampaignDayCloseoutStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "REVIEWED"
  | "SIGNED_OFF";

export type CampaignDayAssessment =
  | "NOT_ASSESSED"
  | "CLEAR"
  | "RESPONSIBILITY_REMAINS"
  | "LEADERSHIP_ACTION_REQUIRED";

export type TomorrowReadinessStatus =
  | "NOT_ASSESSED"
  | "READY"
  | "NEEDS_ATTENTION"
  | "NOT_READY"
  | "NO_MISSIONS_SCHEDULED";

export type CampaignDayCarryForwardSourceType =
  | "ACTIVE_EXECUTION"
  | "DEBRIEF_REQUIRED"
  | "DEBRIEF_APPROVAL"
  | "FOLLOW_UP_ACTION"
  | "COMMITMENT"
  | "BLOCKED_ACTION"
  | "UNASSIGNED_ACTION"
  | "LEADERSHIP_DECISION"
  | "TOMORROW_PREPARATION"
  | "TOMORROW_TRAVEL"
  | "TOMORROW_SCHEDULE"
  | "DATA_INTEGRITY"
  | "OPERATOR_ADDED";

export type CampaignDayCarryForwardStatus =
  | "OPEN"
  | "TRANSFERRED"
  | "RESOLVED"
  | "CANCELLED";

export type MissionDayReviewClassification =
  | "CAPTURE_COMPLETE"
  | "ACTION_REQUIRED"
  | "LEADERSHIP_REVIEW"
  | "NO_EXECUTION_EXPECTED"
  | "RECORD_REVIEW_NEEDED";

export type CloseoutCheckState = "COMPLETE" | "NEEDS_ATTENTION" | "NOT_APPLICABLE";

export type CampaignDayCloseoutPersisted = {
  id: string;
  campaignDateKey: string;
  status: CampaignDayCloseoutStatus;
  todayAssessment: CampaignDayAssessment;
  tomorrowReadiness: TomorrowReadinessStatus;
  closeoutSummary: string | null;
  carryForwardSummary: string | null;
  tomorrowSummary: string | null;
  internalNotes: string | null;
  startedAt: string | null;
  reviewedAt: string | null;
  signedOffAt: string | null;
  startedByUserId: string | null;
  reviewedByUserId: string | null;
  signedOffByUserId: string | null;
  updatedAt: string;
  carryForwardItems: CampaignDayCarryForwardPersisted[];
};

export type CampaignDayCarryForwardPersisted = {
  id: string;
  sourceType: CampaignDayCarryForwardSourceType;
  sourceRecordId: string | null;
  importKey: string | null;
  missionId: string | null;
  title: string;
  reason: string | null;
  ownerName: string | null;
  ownerUserId: string | null;
  targetDateKey: string | null;
  destination: string | null;
  status: CampaignDayCarryForwardStatus;
  createdByUserId: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmptyCloseoutState = {
  id: null;
  campaignDateKey: string;
  status: "NOT_STARTED";
  todayAssessment: "NOT_ASSESSED";
  tomorrowReadiness: "NOT_ASSESSED";
  closeoutSummary: null;
  carryForwardSummary: null;
  tomorrowSummary: null;
  internalNotes: null;
  startedAt: null;
  reviewedAt: null;
  signedOffAt: null;
  startedByUserId: null;
  reviewedByUserId: null;
  signedOffByUserId: null;
  updatedAt: null;
  carryForwardItems: [];
};

export type CampaignDayCloseoutMissionItem = {
  missionId: string;
  title: string;
  whenLabel: string;
  locationLabel: string | null;
  lifecyclePhase: string;
  operationalStatus: string;
  preparationReadiness: string | null;
  executionStatus: string | null;
  debriefStatus: string | null;
  followUpStatus: string | null;
  classification: MissionDayReviewClassification;
  classificationLabel: string;
  primaryActionLabel: string;
  href: string;
};

export type CampaignDayActiveExecutionItem = {
  missionId: string;
  title: string;
  scheduledEndLabel: string;
  arrivedAtLabel: string | null;
  startedAtLabel: string | null;
  executionStatus: string;
  timeSinceScheduledEnd: string | null;
  href: string;
};

export type CampaignDayDebriefReviewItem = {
  missionId: string;
  title: string;
  executionEndedLabel: string | null;
  debriefStatus: string;
  timeSinceExecutionEnded: string | null;
  outcomeAssessment: string | null;
  approvedFollowUpCount: number;
  primaryActionLabel: string;
  href: string;
  group: "NOT_STARTED" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "APPROVED";
};

export type CampaignDayCommitmentReviewItem = {
  id: string;
  title: string;
  missionId: string;
  missionTitle: string;
  ownerLabel: string;
  dueLabel: string | null;
  status: string;
  priority: string;
  flags: string[];
  href: string;
};

export type CampaignDayImmediateFollowUpItem = {
  id: string;
  title: string;
  missionId: string;
  missionTitle: string;
  priority: string;
  ownerLabel: string;
  dueLabel: string | null;
  status: string;
  flags: string[];
  href: string;
};

export type CampaignDayCloseoutActionItem = {
  id: string;
  title: string;
  missionId: string | null;
  missionTitle: string | null;
  ownerLabel: string;
  dueLabel: string;
  priority: string | null;
  status: string;
  statusBucket: "OPEN" | "COMPLETED" | "CANCELLED" | "TRANSFERRED";
  href: string;
  overdueByDays: number | null;
};

export type CampaignDayCloseoutDecisionItem = {
  id: string;
  label: string;
  explanation: string;
  missionId: string | null;
  missionTitle: string | null;
  ageLabel: string | null;
  requiredPermission: string;
  href: string;
};

export type CampaignDayCarryForwardSuggestion = {
  suggestionKey: string;
  sourceType: CampaignDayCarryForwardSourceType;
  sourceRecordId: string;
  missionId: string | null;
  title: string;
  reason: string;
  ownerName: string | null;
  destination: string;
  alreadyPresent: boolean;
};

export type CampaignDayCarryForwardItemViewModel = {
  id: string;
  sourceType: CampaignDayCarryForwardSourceType;
  sourceTypeLabel: string;
  sourceRecordId: string | null;
  missionId: string | null;
  title: string;
  reason: string | null;
  ownerLabel: string;
  targetDateKey: string | null;
  destination: string | null;
  status: CampaignDayCarryForwardStatus;
  statusLabel: string;
  createdAt: string;
};

export type CampaignDayTomorrowMission = {
  missionId: string;
  title: string;
  whenLabel: string;
  locationLabel: string | null;
  preparationReadiness: string | null;
  strategicPurpose: string | null;
  keyMessage: string | null;
  successCriteria: string[];
  arrivalTargetLabel: string | null;
  departureLabel: string | null;
  durationMinutes: number | null;
  missingDeparture: boolean;
  missingKeyMessage: boolean;
  materialsIncomplete: boolean;
  peopleBriefMissing: boolean;
  organizationBriefMissing: boolean;
  gaps: string[];
  href: string;
};

export type CampaignDayScheduleConflict = {
  id: string;
  label: string;
  missionIds: string[];
  missionTitles: string[];
  explanation: string;
};

export type CampaignDayCloseoutCheck = {
  id: string;
  label: string;
  group: "TODAY" | "TOMORROW";
  state: CloseoutCheckState;
  stateLabel: string;
};

export type CampaignDayCloseoutViewModel = {
  campaignDate: string;
  dateLabel: string;
  closingHeading: string;
  timezone: string;
  generatedAt: string;
  isToday: boolean;
  isPast: boolean;
  historicalNotice: string | null;

  closeout: {
    exists: boolean;
    id: string | null;
    status: CampaignDayCloseoutStatus;
    statusLabel: string;
    todayAssessment: CampaignDayAssessment;
    todayAssessmentLabel: string;
    tomorrowReadiness: TomorrowReadinessStatus;
    tomorrowReadinessLabel: string;
    derivedTomorrowReadiness: TomorrowReadinessStatus;
    derivedTomorrowReadinessLabel: string;
    closeoutSummary: string | null;
    carryForwardSummary: string | null;
    tomorrowSummary: string | null;
    internalNotes: string | null;
    startedAt: string | null;
    reviewedAt: string | null;
    signedOffAt: string | null;
    startedByUserId: string | null;
    reviewedByUserId: string | null;
    signedOffByUserId: string | null;
    updatedAt: string | null;
    expectedUpdatedAt: string | null;
  };

  summary: {
    scheduledMissions: number;
    completedExecutions: number;
    activeExecutions: number;
    debriefNotStarted: number;
    debriefInProgress: number;
    debriefAwaitingApproval: number;
    openDueToday: number;
    overdue: number;
    openCommitments: number;
    blocked: number;
    unassigned: number;
    leadershipDecisions: number;
    tomorrowPreparationRisks: number;
    tomorrowConflicts: number;
  };

  todayMissions: CampaignDayCloseoutMissionItem[];
  todayMissionsTotal: number;
  activeExecutions: CampaignDayActiveExecutionItem[];
  debriefReview: CampaignDayDebriefReviewItem[];
  commitments: CampaignDayCommitmentReviewItem[];
  immediateFollowUps: CampaignDayImmediateFollowUpItem[];
  dueToday: CampaignDayCloseoutActionItem[];
  overdue: CampaignDayCloseoutActionItem[];
  leadershipDecisions: CampaignDayCloseoutDecisionItem[];
  carryForwardItems: CampaignDayCarryForwardItemViewModel[];
  suggestedCarryForward: CampaignDayCarryForwardSuggestion[];
  tomorrowFirstMission: CampaignDayTomorrowMission | null;
  tomorrowMissions: CampaignDayTomorrowMission[];
  tomorrowConflicts: CampaignDayScheduleConflict[];
  tomorrowDue: CampaignDayCloseoutActionItem[];
  checklist: CampaignDayCloseoutCheck[];
  reviewBlockers: string[];
  signoffBlockers: string[];
  integrityWarnings: string[];

  navigation: {
    briefingHref: string;
    commandCenterHref: string;
    calendarHref: string;
    reportHref: string;
    todayHref: string;
    previousHref: string | null;
    nextHref: string | null;
  };

  isolation: {
    mutatesMissionRecords: false;
    mutatesEventSchedule: false;
    signoffCompletesUnderlyingWork: false;
  };
};
