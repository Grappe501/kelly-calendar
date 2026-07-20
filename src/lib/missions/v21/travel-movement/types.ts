export type MissionTravelPlanStatus =
  | "DRAFT"
  | "ACTIVE"
  | "READY"
  | "NEEDS_REVIEW"
  | "INACTIVE"
  | "CANCELLED";

export type MissionTravelReadiness =
  | "NOT_ASSESSED"
  | "READY"
  | "READY_WITH_ACCEPTED_RISK"
  | "NOT_READY"
  | "NOT_REQUIRED";

export type MissionTravelMode =
  | "UNSPECIFIED"
  | "DRIVE"
  | "WALK"
  | "FLIGHT"
  | "OTHER";

export type MissionTravelLegStatus =
  | "PLANNED"
  | "CONFIRMED"
  | "SKIPPED"
  | "CANCELLED";

export type MissionTravelIssueType =
  | "NO_PLAN"
  | "MISSING_DEPARTURE"
  | "MISSING_DESTINATION"
  | "MISSING_DRIVER"
  | "MISSING_VEHICLE"
  | "ARRIVAL_AFTER_MISSION_START"
  | "TIME_CONFLICT"
  | "LEG_INCOMPLETE"
  | "LEG_ORDER"
  | "MOVEMENT_OVERLAP"
  | "MISSING_BUFFER"
  | "STALE_AFTER_RESCHEDULE"
  | "CANCELLED_MISSION_ACTIVE_PLAN"
  | "CROSS_MIDNIGHT_AMBIGUITY"
  | "PREP_INCOMPLETE"
  | "OPERATOR_ADDED";

export type MissionTravelAcknowledgementDisposition =
  | "ACKNOWLEDGED"
  | "ACCEPTED_RISK"
  | "RESOLVED"
  | "NOT_APPLICABLE";

export type TravelFindingSeverity = "BLOCKER" | "WARNING" | "INFO";

export type MissionTravelLegPersisted = {
  id: string;
  sequence: number;
  originLabel: string | null;
  destinationLabel: string | null;
  plannedDepartureAt: string | null;
  plannedArrivalAt: string | null;
  mode: MissionTravelMode;
  driverName: string | null;
  vehicleDescription: string | null;
  bufferMinutes: number | null;
  instructions: string | null;
  status: MissionTravelLegStatus;
  createdAt: string;
  updatedAt: string;
};

export type MissionTravelAcknowledgementPersisted = {
  id: string;
  issueKey: string;
  issueType: MissionTravelIssueType;
  title: string;
  disposition: MissionTravelAcknowledgementDisposition;
  note: string | null;
  acceptedRiskReason: string | null;
  acknowledgedAt: string;
  acknowledgedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MissionTravelPlanPersisted = {
  id: string;
  missionId: string;
  campaignDateKey: string;
  status: MissionTravelPlanStatus;
  readinessState: MissionTravelReadiness;
  movementRequired: boolean | null;
  plannedReadyAt: string | null;
  plannedDepartureAt: string | null;
  requiredArrivalAt: string | null;
  bufferMinutes: number | null;
  driverRequired: boolean;
  vehicleRequired: boolean;
  driverName: string | null;
  driverUserId: string | null;
  vehicleDescription: string | null;
  passengerNotes: string | null;
  accessibilityNotes: string | null;
  securityNotes: string | null;
  logisticsNotes: string | null;
  acceptedRiskSummary: string | null;
  internalNotes: string | null;
  scheduleFingerprint: string | null;
  confirmedAt: string | null;
  confirmedByUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  legs: MissionTravelLegPersisted[];
  acknowledgements: MissionTravelAcknowledgementPersisted[];
};

export type TravelMissionContext = {
  missionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationLabel: string | null;
  campaignDateKey: string;
  lifecyclePhase: string;
  operationalStatus: string;
  /** From Event travelRequired — never inferred as requiring driver/vehicle */
  eventTravelRequired: boolean;
  isCancelled: boolean;
  preparationExists: boolean;
  preparationReadiness: string | null;
};

export type TravelFinding = {
  issueKey: string;
  issueType: MissionTravelIssueType;
  title: string;
  explanation: string;
  severity: TravelFindingSeverity;
  severityLabel: string;
  missionId: string;
  disposition: MissionTravelAcknowledgementDisposition | null;
  clearsForReadiness: boolean;
};

export type MissionTravelWorkspaceView = {
  mission: {
    missionId: string;
    title: string;
    whenLabel: string;
    locationLabel: string | null;
    campaignDateKey: string;
    lifecyclePhase: string;
    operationalStatus: string;
    eventTravelRequired: boolean;
    isCancelled: boolean;
    href: string;
    prepareHref: string;
    executeHref: string;
  };
  plan: {
    exists: boolean;
    id: string | null;
    status: MissionTravelPlanStatus;
    statusLabel: string;
    readinessState: MissionTravelReadiness;
    readinessStateLabel: string;
    derivedReadiness: MissionTravelReadiness;
    derivedReadinessLabel: string;
    movementRequired: boolean | null;
    plannedReadyAt: string | null;
    plannedDepartureAt: string | null;
    requiredArrivalAt: string | null;
    bufferMinutes: number | null;
    driverRequired: boolean;
    vehicleRequired: boolean;
    driverName: string | null;
    driverUserId: string | null;
    vehicleDescription: string | null;
    passengerNotes: string | null;
    accessibilityNotes: string | null;
    securityNotes: string | null;
    logisticsNotes: string | null;
    acceptedRiskSummary: string | null;
    internalNotes: string | null;
    scheduleFingerprint: string | null;
    confirmedAt: string | null;
    expectedUpdatedAt: string | null;
    legs: MissionTravelLegPersisted[];
    acknowledgements: MissionTravelAcknowledgementPersisted[];
  };
  findings: TravelFinding[];
  blockerCount: number;
  warningCount: number;
  boundaryMessage: string;
  isolation: {
    mutatesMissionLifecycle: false;
    mutatesEventSchedule: false;
    startsExecution: false;
  };
};

export type DayMovementMissionCard = {
  missionId: string;
  title: string;
  whenLabel: string;
  locationLabel: string | null;
  isFirst: boolean;
  isPrimary: boolean;
  isCancelled: boolean;
  planExists: boolean;
  planStatus: MissionTravelPlanStatus | null;
  readiness: MissionTravelReadiness;
  readinessLabel: string;
  departureLabel: string | null;
  arrivalLabel: string | null;
  bufferMinutes: number | null;
  driverLabel: string | null;
  vehicleLabel: string | null;
  legCount: number;
  legs: Array<{
    sequence: number;
    originLabel: string | null;
    destinationLabel: string | null;
    departureLabel: string | null;
    arrivalLabel: string | null;
  }>;
  blockerCount: number;
  warningCount: number;
  findings: TravelFinding[];
  href: string;
};

export type DayMovementBoardView = {
  campaignDate: string;
  dateLabel: string;
  timezone: string;
  generatedAt: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  summary: {
    missionCount: number;
    withPlanCount: number;
    withoutPlanCount: number;
    blockerCount: number;
    warningCount: number;
    firstMissionTitle: string | null;
    primaryMissionTitle: string | null;
  };
  missions: DayMovementMissionCard[];
  navigation: {
    todayHref: string;
    briefingHref: string;
    launchHref: string;
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
