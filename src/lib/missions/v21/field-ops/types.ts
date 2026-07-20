export type MissionFieldOpsSessionStatus =
  | "OPEN"
  | "CHECKING"
  | "READY"
  | "READY_WITH_RISK"
  | "WRAP_PENDING"
  | "CLOSED"
  | "CANCELLED";

export type MissionFieldOpsReadiness =
  | "NOT_ASSESSED"
  | "READY"
  | "READY_WITH_ACCEPTED_RISK"
  | "NOT_READY"
  | "NOT_REQUIRED"
  | "WRAP_PENDING";

export type MissionFieldConfirmationState =
  | "PRESENT"
  | "MISSING"
  | "DAMAGED"
  | "SUBSTITUTED"
  | "NOT_USABLE"
  | "NOT_APPLICABLE"
  | "RETURNED"
  | "RETURN_MISSING";

export type MissionFieldItemCondition = "GOOD" | "DAMAGED" | "UNKNOWN";

export type MissionFieldOpsIssueType =
  | "NO_PACK"
  | "NO_SESSION"
  | "CRITICAL_UNCONFIRMED"
  | "CRITICAL_MISSING"
  | "CRITICAL_DAMAGED"
  | "CRITICAL_SUBSTITUTED"
  | "CRITICAL_NOT_USABLE"
  | "SUBSTITUTE_UNACCEPTED"
  | "HANDOFF_INCOMPLETE_AT_CHECK"
  | "RETURN_OUTSTANDING"
  | "RETURN_MISSING"
  | "RETURN_DAMAGED"
  | "STALE_AFTER_LOGISTICS_CHANGE"
  | "STALE_AFTER_RESCHEDULE"
  | "STALE_AFTER_TRAVEL_CHANGE"
  | "CANCELLED_MISSION_OPEN_SESSION"
  | "WRONG_CAMPAIGN_DAY"
  | "OVERNIGHT_WRAP_OPEN"
  | "OPERATOR_ADDED";

export type MissionFieldOpsAcknowledgementDisposition =
  | "ACKNOWLEDGED"
  | "ACCEPTED_RISK"
  | "RESOLVED"
  | "NOT_APPLICABLE";

export type FieldOpsFindingSeverity = "BLOCKER" | "WARNING" | "INFO";

export type FieldConfirmationHistoryEntry = {
  state: MissionFieldConfirmationState;
  condition: MissionFieldItemCondition;
  confirmedAt: string;
  confirmedByUserId: string | null;
  observedQuantityLabel: string | null;
  substituteDescription: string | null;
  exceptionNote: string | null;
};

export type MissionFieldItemConfirmationPersisted = {
  id: string;
  logisticsItemId: string | null;
  itemDescriptionSnapshot: string;
  itemCriticalitySnapshot: string;
  itemReturnRequiredSnapshot: boolean;
  state: MissionFieldConfirmationState;
  observedQuantityLabel: string | null;
  condition: MissionFieldItemCondition;
  substituteDescription: string | null;
  exceptionNote: string | null;
  locationLabel: string | null;
  confirmedAt: string;
  confirmedByUserId: string | null;
  history: FieldConfirmationHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type MissionFieldOpsAcknowledgementPersisted = {
  id: string;
  issueKey: string;
  issueType: MissionFieldOpsIssueType;
  title: string;
  disposition: MissionFieldOpsAcknowledgementDisposition;
  note: string | null;
  acceptedRiskReason: string | null;
  acknowledgedAt: string;
  acknowledgedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MissionFieldOpsSessionPersisted = {
  id: string;
  missionId: string;
  campaignDateKey: string;
  status: MissionFieldOpsSessionStatus;
  readinessState: MissionFieldOpsReadiness;
  fieldLeadName: string | null;
  fieldLeadUserId: string | null;
  locationLabel: string | null;
  contextNote: string | null;
  checkInAt: string | null;
  checkInByUserId: string | null;
  readinessConfirmedAt: string | null;
  readinessConfirmedByUserId: string | null;
  wrapStartedAt: string | null;
  wrapStartedByUserId: string | null;
  closedAt: string | null;
  closedByUserId: string | null;
  acceptedRiskSummary: string | null;
  internalNotes: string | null;
  fieldNotes: string | null;
  logisticsFingerprint: string | null;
  scheduleFingerprint: string | null;
  travelFingerprint: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  confirmations: MissionFieldItemConfirmationPersisted[];
  acknowledgements: MissionFieldOpsAcknowledgementPersisted[];
};

/** D12 item projection for field ops — never copied into a second checklist table. */
export type FieldOpsLogisticsItemRef = {
  id: string;
  sequence: number;
  description: string;
  quantityLabel: string | null;
  status: string;
  criticality: string;
  returnRequired: boolean;
  responsibleName: string | null;
};

export type FieldOpsLogisticsHandoffRef = {
  id: string;
  logisticsItemId: string | null;
  status: string;
  giverConfirmedAt: string | null;
  receiverConfirmedAt: string | null;
};

export type FieldOpsLogisticsPackRef = {
  id: string;
  status: string;
  logisticsRequired: boolean | null;
  items: FieldOpsLogisticsItemRef[];
  handoffs: FieldOpsLogisticsHandoffRef[];
};

export type FieldOpsMissionContext = {
  missionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationLabel: string | null;
  campaignDateKey: string;
  lifecyclePhase: string;
  operationalStatus: string;
  executionStatus: string | null;
  isCancelled: boolean;
  materialsIndicated: boolean;
  travelPlannedDepartureAt: string | null;
  pack: FieldOpsLogisticsPackRef | null;
};

export type FieldOpsFinding = {
  issueKey: string;
  issueType: MissionFieldOpsIssueType;
  title: string;
  explanation: string;
  severity: FieldOpsFindingSeverity;
  severityLabel: string;
  missionId: string;
  logisticsItemId: string | null;
  disposition: MissionFieldOpsAcknowledgementDisposition | null;
  clearsForReadiness: boolean;
};

export type MissionFieldOpsWorkspaceView = {
  mission: {
    missionId: string;
    title: string;
    whenLabel: string;
    locationLabel: string | null;
    campaignDateKey: string;
    lifecyclePhase: string;
    operationalStatus: string;
    executionStatus: string | null;
    materialsIndicated: boolean;
    isCancelled: boolean;
    href: string;
    prepareHref: string;
    executeHref: string;
    logisticsHref: string;
    travelHref: string;
  };
  session: {
    exists: boolean;
    id: string | null;
    status: MissionFieldOpsSessionStatus;
    statusLabel: string;
    readinessState: MissionFieldOpsReadiness;
    readinessStateLabel: string;
    derivedReadiness: MissionFieldOpsReadiness;
    derivedReadinessLabel: string;
    fieldLeadName: string | null;
    locationLabel: string | null;
    contextNote: string | null;
    checkInAt: string | null;
    readinessConfirmedAt: string | null;
    wrapStartedAt: string | null;
    closedAt: string | null;
    acceptedRiskSummary: string | null;
    fieldNotes: string | null;
    internalNotes: string | null;
    expectedUpdatedAt: string | null;
    confirmations: MissionFieldItemConfirmationPersisted[];
    acknowledgements: MissionFieldOpsAcknowledgementPersisted[];
  };
  logisticsItems: Array<
    FieldOpsLogisticsItemRef & {
      confirmation: MissionFieldItemConfirmationPersisted | null;
      d12StatusDoesNotImplyPresence: true;
    }
  >;
  findings: FieldOpsFinding[];
  blockerCount: number;
  warningCount: number;
  boundaryMessage: string;
  isolation: {
    mutatesMissionLifecycle: false;
    mutatesExecuteStatus: false;
    mutatesLogisticsItemStatus: false;
    startsExecution: false;
  };
};

export type DayFieldOpsMissionCard = {
  missionId: string;
  title: string;
  whenLabel: string;
  locationLabel: string | null;
  isFirst: boolean;
  isPrimary: boolean;
  isCancelled: boolean;
  sessionExists: boolean;
  sessionStatus: MissionFieldOpsSessionStatus | null;
  readiness: MissionFieldOpsReadiness;
  readinessLabel: string;
  criticalUnconfirmedCount: number;
  outstandingReturnCount: number;
  blockerCount: number;
  warningCount: number;
  findings: FieldOpsFinding[];
  href: string;
  logisticsHref: string;
  executeHref: string;
};

export type DayFieldOpsBoardView = {
  campaignDate: string;
  dateLabel: string;
  timezone: string;
  generatedAt: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  summary: {
    missionCount: number;
    withSessionCount: number;
    withoutSessionCount: number;
    blockerCount: number;
    warningCount: number;
    firstMissionTitle: string | null;
    primaryMissionTitle: string | null;
  };
  missions: DayFieldOpsMissionCard[];
  navigation: {
    todayHref: string;
    briefingHref: string;
    launchHref: string;
    logisticsHref: string;
    movementHref: string;
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
