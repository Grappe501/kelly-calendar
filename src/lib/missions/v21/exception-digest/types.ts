export type CampaignDayIncidentDigestReviewStatus =
  | "DRAFT"
  | "REVIEWED"
  | "STALE";

export type DigestBucket =
  | "OPEN_HIGH_CRITICAL"
  | "OPEN_LOWER_SEVERITY"
  | "MONITORING_STABILIZED"
  | "EXPLICIT_CARRY_FORWARD"
  | "FOLLOW_UP_GAP"
  | "UPDATED_AFTER_CLOSEOUT"
  | "UPDATED_AFTER_DIGEST_REVIEW"
  | "OVERNIGHT"
  | "CANCELLED_MISSION"
  | "ACCEPTED_RISK"
  | "ACKNOWLEDGED_BLOCKER"
  | "ORIGINATED_EARLIER"
  | "RESOLVED_DURING_DAY";

export type DigestFollowUpLinkState =
  | "NOT_REQUIRED"
  | "REQUIRED_LINKED"
  | "REQUIRED_UNLINKED";

export type CampaignDayIncidentDigestReviewPersisted = {
  id: string;
  campaignDateKey: string;
  status: CampaignDayIncidentDigestReviewStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  note: string | null;
  sourceFingerprint: string;
  staleAt: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DigestIncidentEntry = {
  incidentId: string;
  incidentRef: string;
  missionId: string;
  missionTitle: string;
  originCampaignDateKey: string;
  sourceDayAttribution: "SELECTED_DAY" | "EARLIER_DAY";
  status: string;
  severity: string;
  category: string;
  sensitivity: string;
  summary: string;
  isConfidentialHidden: boolean;
  carryForwardRequired: boolean;
  carriedForwardAt: string | null;
  followUpLinkState: DigestFollowUpLinkState;
  linkedFollowUpActionId: string | null;
  lastPermittedUpdateAt: string;
  findingIssueKeys: string[];
  buckets: DigestBucket[];
  highestFindingSeverity: "BLOCKER" | "WARNING" | "INFO" | null;
  acceptedRisk: boolean;
  acknowledgedUnclearedBlocker: boolean;
  dispositionNote: string | null;
  href: string;
  missionHref: string;
  followUpHref: string | null;
};

export type DigestCounts = {
  /** Privacy-aware: excludes confidential from restricted viewers when applied upstream. */
  visibleIncidentCount: number;
  openHighCriticalCount: number;
  openLowerSeverityCount: number;
  monitoringStabilizedCount: number;
  explicitCarryForwardCount: number;
  followUpGapCount: number;
  acknowledgedBlockerCount: number;
  acceptedRiskCount: number;
  postCloseoutUpdateCount: number;
  postDigestUpdateCount: number;
  overnightCount: number;
  cancelledMissionCount: number;
  originatedEarlierCount: number;
  resolvedDuringDayCount: number;
  /** Highest severity among visible entries only. */
  highestActiveSeverity: string | null;
  /** True when any confidential incidents were omitted from visible counts. */
  confidentialOmitted: boolean;
};

export type DigestReviewView = {
  exists: boolean;
  status: CampaignDayIncidentDigestReviewStatus | "NONE";
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  note: string | null;
  sourceFingerprint: string | null;
  currentFingerprint: string;
  isStale: boolean;
  staleAt: string | null;
  canCompleteReview: boolean;
};

export type DayExceptionDigestView = {
  campaignDate: string;
  dateLabel: string;
  timezone: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  generatedAt: string;
  emergencyNotice: string;
  boundaryMessage: string;
  firstMissionTitle: string | null;
  primaryMissionTitle: string | null;
  firstMissionId: string | null;
  primaryMissionId: string | null;
  counts: DigestCounts;
  entries: DigestIncidentEntry[];
  review: DigestReviewView;
  closeoutReviewedAt: string | null;
  tomorrowPreview: DigestIncidentEntry[];
  launchQualified: DigestIncidentEntry[];
  navigation: {
    previousHref: string | null;
    nextHref: string | null;
    todayHref: string;
    briefingHref: string;
    incidentsHref: string;
    closeoutHref: string;
    launchHref: string;
    commandCenterHref: string;
    reportHref: string;
    calendarHref: string;
  };
  isolation: {
    mutatesIncidents: false;
    mutatesCloseout: false;
    mutatesLaunch: false;
    mutatesFollowUp: false;
    mutatesMissionLifecycle: false;
    createsMobilizeRecords: false;
    performsRemoteSync: false;
  };
};

export type DigestFilter = {
  missionId?: string | null;
  severity?: string | null;
  status?: string | null;
  category?: string | null;
  carryForward?: "any" | "required" | "carried" | "none" | null;
  followUpState?: DigestFollowUpLinkState | "any" | null;
};
