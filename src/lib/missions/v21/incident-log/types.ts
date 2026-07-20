export type MissionIncidentCategory =
  | "SAFETY"
  | "ACCESS"
  | "SECURITY"
  | "PRESS"
  | "TRAVEL"
  | "LOGISTICS"
  | "TECHNOLOGY"
  | "STAFFING"
  | "SCHEDULE"
  | "VENUE"
  | "PUBLIC_INTERACTION"
  | "OTHER";

export type MissionIncidentSeverity =
  | "INFO"
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "CRITICAL";

export type MissionIncidentStatus =
  | "OPEN"
  | "MONITORING"
  | "STABILIZED"
  | "RESOLVED"
  | "CLOSED";

export type MissionIncidentSensitivity =
  | "STANDARD"
  | "RESTRICTED"
  | "CONFIDENTIAL";

export type MissionIncidentUpdateType =
  | "OBSERVATION"
  | "ACTION_TAKEN"
  | "STATUS_CHANGE"
  | "SEVERITY_CHANGE"
  | "HANDOFF"
  | "RESOLUTION"
  | "FOLLOW_UP_NOTE"
  | "CORRECTION";

export type MissionIncidentIssueType =
  | "OPEN_HIGH_CRITICAL"
  | "EXECUTE_COMPLETED_OPEN"
  | "STABILIZED_UNRESOLVED"
  | "CARRY_FORWARD_REQUIRED"
  | "FOLLOW_UP_REQUIRED_UNLINKED"
  | "CANCELLED_MISSION_ACTIVE"
  | "UPDATED_AFTER_CLOSEOUT"
  | "OVERNIGHT_ACTIVE"
  | "MISSING_OWNER"
  | "RESOLUTION_NOTE_MISSING"
  | "OPERATOR_ADDED";

export type MissionIncidentAcknowledgementDisposition =
  | "ACKNOWLEDGED"
  | "ACCEPTED_RISK"
  | "RESOLVED"
  | "NOT_APPLICABLE";

export type IncidentFindingSeverity = "BLOCKER" | "WARNING" | "INFO";

export type MissionIncidentUpdatePersisted = {
  id: string;
  updateType: MissionIncidentUpdateType;
  note: string | null;
  actionTaken: string | null;
  occurredAt: string;
  recordedAt: string;
  recordedByUserId: string | null;
  previousStatus: MissionIncidentStatus | null;
  newStatus: MissionIncidentStatus | null;
  previousSeverity: MissionIncidentSeverity | null;
  newSeverity: MissionIncidentSeverity | null;
  sensitivity: MissionIncidentSensitivity;
  createdAt: string;
};

export type MissionIncidentAcknowledgementPersisted = {
  id: string;
  issueKey: string;
  issueType: MissionIncidentIssueType;
  title: string;
  disposition: MissionIncidentAcknowledgementDisposition;
  note: string | null;
  acceptedRiskReason: string | null;
  acknowledgedAt: string;
  acknowledgedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MissionIncidentPersisted = {
  id: string;
  missionId: string;
  campaignDateKey: string;
  incidentRef: string;
  category: MissionIncidentCategory;
  severity: MissionIncidentSeverity;
  status: MissionIncidentStatus;
  summary: string;
  description: string | null;
  observedAt: string;
  reportedAt: string;
  reportedByUserId: string | null;
  locationLabel: string | null;
  sensitivity: MissionIncidentSensitivity;
  immediateActionSummary: string | null;
  ownerName: string | null;
  ownerUserId: string | null;
  carryForwardRequired: boolean;
  carriedForwardAt: string | null;
  carriedForwardByUserId: string | null;
  followUpRequired: boolean;
  linkedFollowUpActionId: string | null;
  linkedFollowUpImportKey: string | null;
  stabilizedAt: string | null;
  stabilizedByUserId: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  closedAt: string | null;
  closedByUserId: string | null;
  archivedAt: string | null;
  archivedByUserId: string | null;
  isArchived: boolean;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  updates: MissionIncidentUpdatePersisted[];
  acknowledgements: MissionIncidentAcknowledgementPersisted[];
};

export type IncidentMissionContext = {
  missionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  campaignDateKey: string;
  lifecyclePhase: string;
  operationalStatus: string;
  executionStatus: string | null;
  isCancelled: boolean;
  closeoutReviewedAt?: string | null;
};

export type IncidentFinding = {
  issueKey: string;
  issueType: MissionIncidentIssueType;
  title: string;
  explanation: string;
  severity: IncidentFindingSeverity;
  severityLabel: string;
  missionId: string;
  incidentId: string;
  disposition: MissionIncidentAcknowledgementDisposition | null;
  clearsForReadiness: boolean;
};

export type MissionIncidentListItem = {
  id: string;
  incidentRef: string;
  category: MissionIncidentCategory;
  categoryLabel: string;
  severity: MissionIncidentSeverity;
  severityLabel: string;
  status: MissionIncidentStatus;
  statusLabel: string;
  sensitivity: MissionIncidentSensitivity;
  sensitivityLabel: string;
  summary: string;
  observedAt: string;
  observedLabel: string;
  ownerName: string | null;
  isArchived: boolean;
  followUpRequired: boolean;
  carryForwardRequired: boolean;
  linkedFollowUpActionId: string | null;
  blockerCount: number;
  warningCount: number;
  findings: IncidentFinding[];
  href: string;
  expectedUpdatedAt: string;
};

export type MissionIncidentWorkspaceView = {
  mission: {
    missionId: string;
    title: string;
    whenLabel: string;
    campaignDateKey: string;
    lifecyclePhase: string;
    operationalStatus: string;
    executionStatus: string | null;
    isCancelled: boolean;
    href: string;
    prepareHref: string;
    executeHref: string;
    fieldOpsHref: string;
    incidentsHref: string;
  };
  emergencyNotice: string;
  incidents: MissionIncidentListItem[];
  summary: {
    totalCount: number;
    activeCount: number;
    archivedCount: number;
    highCriticalCount: number;
    blockerCount: number;
    warningCount: number;
  };
  boundaryMessage: string;
  isolation: {
    mutatesMissionLifecycle: false;
    mutatesExecuteStatus: false;
    mutatesFieldOpsStatus: false;
    mutatesLogisticsStatus: false;
    mutatesTravelStatus: false;
    startsExecution: false;
  };
};

export type MissionIncidentDetailView = {
  mission: MissionIncidentWorkspaceView["mission"];
  emergencyNotice: string;
  incident: MissionIncidentPersisted;
  updates: MissionIncidentUpdatePersisted[];
  acknowledgements: MissionIncidentAcknowledgementPersisted[];
  findings: IncidentFinding[];
  blockerCount: number;
  warningCount: number;
  expectedUpdatedAt: string;
  boundaryMessage: string;
  isolation: MissionIncidentWorkspaceView["isolation"];
};

export type DayIncidentCard = {
  incidentId: string;
  incidentRef: string;
  missionId: string;
  missionTitle: string;
  whenLabel: string;
  category: MissionIncidentCategory;
  categoryLabel: string;
  severity: MissionIncidentSeverity;
  severityLabel: string;
  status: MissionIncidentStatus;
  statusLabel: string;
  sensitivity: MissionIncidentSensitivity;
  summary: string | null;
  isArchived: boolean;
  isHighCritical: boolean;
  blockerCount: number;
  warningCount: number;
  findings: IncidentFinding[];
  href: string;
  missionHref: string;
};

export type DayIncidentBoardView = {
  campaignDate: string;
  dateLabel: string;
  timezone: string;
  generatedAt: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  emergencyNotice: string;
  summary: {
    missionCount: number;
    incidentCount: number;
    activeCount: number;
    highCriticalCount: number;
    archivedCount: number;
    blockerCount: number;
    warningCount: number;
    firstMissionTitle: string | null;
    primaryMissionTitle: string | null;
  };
  incidents: DayIncidentCard[];
  navigation: {
    todayHref: string;
    briefingHref: string;
    launchHref: string;
    fieldOpsHref: string;
    closeoutHref: string;
    commandCenterHref: string;
    todaysMissionHref: string;
    reportHref: string;
    previousHref: string | null;
    nextHref: string | null;
  };
  isolation: {
    mutatesMissionLifecycle: false;
    startsExecution: false;
    launchesCampaignDay: false;
  };
};
