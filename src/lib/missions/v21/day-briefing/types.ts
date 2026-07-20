import type { CampaignDayBriefingConfig } from "@/lib/missions/v21/day-briefing/briefing-config";
import type { AttentionSeverity } from "@/lib/missions/v21/command-center/types";
import type { MissionDebriefStatus, MissionOutcomeAssessment } from "@/lib/missions/v21/debrief/types";
import type { MissionExecutionStatus } from "@/lib/missions/v21/execution/types";
import type {
  MissionFollowUpActionStatus,
  MissionFollowUpPriority,
  MissionFollowUpSourceType,
  MissionFollowUpStatus,
} from "@/lib/missions/v21/follow-up/types";
import type { PreparationReadinessState } from "@/lib/missions/v21/preparation/types";
import type {
  MissionLifecyclePhase,
  MissionOperationalStatus,
} from "@/lib/missions/v21/types";

export type CampaignDayBriefingStatus =
  | "READY_TO_REVIEW"
  | "NEEDS_PREPARATION"
  | "ACTIVE_DAY"
  | "DAY_COMPLETE"
  | "NO_SCHEDULED_MISSIONS";

export type CampaignDayEndOfDayStatus =
  | "CLEAR"
  | "WORK_REMAINS"
  | "LEADERSHIP_REVIEW_REMAINS"
  | "ACTIVE_EXECUTION_REMAINS";

export type CampaignDayTimelineEntryType =
  | "DEPARTURE"
  | "ARRIVAL_TARGET"
  | "MISSION_START"
  | "MISSION_END"
  | "PREPARATION_DUE"
  | "FOLLOW_UP_DUE"
  | "APPROVAL_REQUIRED"
  | "INTERNAL";

export type CampaignDayLeadershipDecisionReason =
  | "DEBRIEF_APPROVAL_REQUIRED"
  | "MISSION_CLOSEOUT_REVIEW"
  | "FOLLOW_UP_BLOCKER_APPROVAL"
  | "SCHEDULE_CONFLICT_REVIEW"
  | "PREPARATION_LEADERSHIP_REVIEW"
  | "RECORD_INTEGRITY_REVIEW";

export type CampaignDayEndOfDayReason =
  | "EXECUTION_STILL_ACTIVE"
  | "DEBRIEF_NOT_STARTED"
  | "DEBRIEF_IN_PROGRESS"
  | "DUE_ACTION_OPEN"
  | "URGENT_ACTION_UNASSIGNED"
  | "TOMORROW_PREPARATION_NOT_READY"
  | "TOMORROW_DEPARTURE_NOT_SET"
  | "LEADERSHIP_DECISION_PENDING";

export type CampaignDayRiskCategory =
  | "SCHEDULE"
  | "TRAVEL"
  | "PREPARATION"
  | "EXECUTION"
  | "DEBRIEF"
  | "FOLLOW_UP"
  | "COMMITMENT"
  | "APPROVAL"
  | "DATA_INTEGRITY";

export type BriefingAttentionItem = {
  id: string;
  label: string;
  severity: AttentionSeverity;
  severityLabel: string;
  explanation: string;
  href: string;
  missionId: string | null;
};

export type CampaignDayPrimaryMission = {
  missionId: string;
  title: string;
  whenLabel: string;
  locationLabel: string | null;
  lifecyclePhase: MissionLifecyclePhase;
  lifecyclePhaseLabel: string;
  operationalStatus: MissionOperationalStatus;
  preparationReadiness: PreparationReadinessState | null;
  objective: string | null;
  strategicPurpose: string | null;
  keyMessage: string | null;
  successCriteria: string[];
  whoToFind: string[];
  cannotForget: string[];
  primaryHref: string;
  primaryActionLabel: string;
  secondaryHref: string;
  secondaryActionLabel: string;
};

export type CampaignDayTimelineEntry = {
  id: string;
  type: CampaignDayTimelineEntryType;
  typeLabel: string;
  sortAt: string | null;
  isAllDay: boolean;
  timeLabel: string;
  title: string;
  locationLabel: string | null;
  statusLabel: string | null;
  missionId: string | null;
  href: string | null;
  severity: AttentionSeverity | null;
  severityLabel: string | null;
  sourceLabel: string;
};

export type CampaignDayTravelLeg = {
  id: string;
  missionId: string;
  missionTitle: string;
  destinationLabel: string | null;
  departureAt: string | null;
  departureLabel: string | null;
  arrivalTargetAt: string | null;
  arrivalTargetLabel: string | null;
  durationMinutes: number | null;
  parking: string | null;
  arrivalInstructions: string | null;
  accessibilityNotes: string | null;
  stateLabel: string;
  missingDeparture: boolean;
  href: string;
};

export type CampaignDayPreparationItem = {
  id: string;
  missionId: string;
  missionTitle: string;
  requirement: string;
  stateLabel: string;
  ownerLabel: string | null;
  timeContext: string | null;
  rank: number;
  href: string;
};

export type CampaignDayMessageItem = {
  missionId: string;
  missionTitle: string;
  keyMessage: string | null;
  desiredImpression: string | null;
  openingApproach: string | null;
  closingApproach: string | null;
  questionsToAsk: string[];
  commitmentsToAvoid: string[];
  sensitivities: string[];
  href: string;
};

export type CampaignDayPersonItem = {
  id: string;
  name: string;
  role: string | null;
  organization: string | null;
  missionId: string;
  missionTitle: string;
  whyTheyMatter: string | null;
  conversationGoal: string | null;
  appearsInMissionCount: number;
  stableId: string | null;
  href: string;
};

export type CampaignDayOrganizationItem = {
  id: string;
  name: string;
  missionId: string;
  missionTitle: string;
  whyItMatters: string | null;
  desiredOutcome: string | null;
  appearsInMissionCount: number;
  href: string;
};

export type CampaignDayActionItem = {
  id: string;
  title: string;
  missionId: string | null;
  missionTitle: string | null;
  ownerLabel: string;
  dueAt: string | null;
  dueLabel: string;
  priority: MissionFollowUpPriority | null;
  status: MissionFollowUpActionStatus | string;
  statusLabel: string;
  sourceGroup: "COMMITMENTS" | "MISSION_FOLLOW_UP" | "PREPARATION" | "APPROVALS" | "QUESTIONS";
  relatedLabel: string | null;
  href: string;
  overdueByDays: number | null;
};

export type CampaignDayDecisionItem = {
  id: string;
  reason: CampaignDayLeadershipDecisionReason;
  label: string;
  explanation: string;
  missionId: string | null;
  missionTitle: string | null;
  ageLabel: string | null;
  severity: AttentionSeverity;
  severityLabel: string;
  requiredPermission: string;
  href: string;
};

export type CampaignDayRiskItem = {
  id: string;
  category: CampaignDayRiskCategory;
  categoryLabel: string;
  missionId: string | null;
  missionTitle: string | null;
  issue: string;
  severity: AttentionSeverity;
  severityLabel: string;
  timeContext: string | null;
  href: string;
};

export type CampaignDayResponsibilityItem = {
  id: string;
  reason: CampaignDayEndOfDayReason;
  label: string;
  missionId: string | null;
  missionTitle: string | null;
  actionLabel: string;
  href: string;
  severity: AttentionSeverity;
  severityLabel: string;
};

export type CampaignDayTomorrowPreview = {
  dateKey: string;
  firstMissionId: string | null;
  firstMissionTitle: string | null;
  firstMissionTimeLabel: string | null;
  locationLabel: string | null;
  preparationReadiness: PreparationReadinessState | null;
  departureLabel: string | null;
  missingDeparture: boolean;
  preparationGap: string | null;
  dueTomorrowCount: number;
  briefingHref: string;
};

export type CampaignDayBriefingViewModel = {
  briefingDate: string;
  campaignDateLabel: string;
  campaignTimezone: string;
  generatedAt: string;
  briefingStatus: CampaignDayBriefingStatus;
  briefingStatusLabel: string;
  dayKindLabel: string | null;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  historicalDisclaimer: string | null;
  staleWarningMinutes: number;
  config: CampaignDayBriefingConfig;

  executiveSummary: {
    sentences: string[];
    scheduledMissionCount: number;
    primaryMissionId: string | null;
    primaryMissionTitle: string | null;
    firstMissionTime: string | null;
    finalMissionTime: string | null;
    firstDepartureTime: string | null;
    preparationRiskCount: number;
    dueTodayCount: number;
    overdueCount: number;
    leadershipDecisionCount: number;
    topAttentionItem: BriefingAttentionItem | null;
  };

  primaryMission: CampaignDayPrimaryMission | null;
  timeline: CampaignDayTimelineEntry[];
  timelineTotal: number;
  travel: CampaignDayTravelLeg[];
  preparation: CampaignDayPreparationItem[];
  preparationTotal: number;
  missionMessages: CampaignDayMessageItem[];
  people: CampaignDayPersonItem[];
  peopleTotal: number;
  organizations: CampaignDayOrganizationItem[];
  organizationsTotal: number;
  dueToday: CampaignDayActionItem[];
  dueTodayTotal: number;
  overdue: CampaignDayActionItem[];
  overdueTotal: number;
  leadershipDecisions: CampaignDayDecisionItem[];
  leadershipDecisionsTotal: number;
  risks: CampaignDayRiskItem[];
  risksTotal: number;
  endOfDay: CampaignDayResponsibilityItem[];
  endOfDayStatus: CampaignDayEndOfDayStatus;
  endOfDayStatusLabel: string;
  tomorrowPreview: CampaignDayTomorrowPreview | null;

  navigation: {
    previousDate: string | null;
    nextDate: string | null;
    todayDate: string;
    todayHref: string;
    previousHref: string | null;
    nextHref: string | null;
    commandCenterHref: string;
    calendarHref: string;
    todaysMissionHref: string;
  };

  sourceStatus: {
    missionCount: number;
    preparationCount: number;
    executionCount: number;
    debriefCount: number;
    followUpActionCount: number;
    lastRefreshedAt: string;
    historicalSnapshot: false;
  };

  isolation: {
    readOnly: true;
    mutatesRecords: false;
    eventScheduleEditableHere: false;
  };
};

/** Intermediate snapshot for pure builders (no Prisma). */
export type DayBriefingMissionSnapshot = {
  missionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationLabel: string | null;
  isAllDay: boolean;
  lifecyclePhase: MissionLifecyclePhase;
  operationalStatus: MissionOperationalStatus;
  travelRequired: boolean;
  objective: string | null;
  successCriteria: string[];
  eventDepartureAt: string | null;
  eventArrivalAt: string | null;
  travelPlan: {
    departureAt: string | null;
    targetArrivalAt: string | null;
    estimatedDurationMinutes: number | null;
    parkingInstructions: string | null;
  } | null;
  /** V2.1 Mission-owned travel plan (D11). Null when not created. */
  missionTravelPlan: {
    exists: boolean;
    status: string | null;
    plannedDepartureAt: string | null;
    requiredArrivalAt: string | null;
    bufferMinutes: number | null;
    movementRequired: boolean | null;
  } | null;
  preparation: {
    exists: boolean;
    readiness: PreparationReadinessState | null;
    strategicPurpose: string | null;
    keyMessage: string | null;
    desiredImpression: string | null;
    openingApproach: string | null;
    closingApproach: string | null;
    questionsToAsk: string[];
    commitmentsToAvoid: string[];
    sensitivities: string[];
    peopleBriefings: Array<{
      id: string;
      name: string;
      roleOrTitle: string | null;
      organization: string | null;
      whyTheyMatter: string | null;
      conversationGoal: string | null;
      linkedPersonId: string | null;
    }>;
    organizationBriefings: Array<{
      id: string;
      name: string;
      relationshipToMission: string | null;
      desiredOutcome: string | null;
    }>;
    arrivalInstructions: string | null;
    parkingInstructions: string | null;
    accessibilityNotes: string | null;
    travelNotes: string | null;
    materialsNeeded: string[];
    preparationTasks: Array<{
      id: string;
      label: string;
      owner: string | null;
      dueAt: string | null;
      completed: boolean;
    }>;
  };
  execution: {
    exists: boolean;
    status: MissionExecutionStatus | null;
    arrivedAt: string | null;
    startedAt: string | null;
    endedAt: string | null;
  };
  debrief: {
    exists: boolean;
    status: MissionDebriefStatus | null;
    outcomeAssessment: MissionOutcomeAssessment | null;
    completedAt: string | null;
    approvedAt: string | null;
  };
  followUp: {
    exists: boolean;
    status: MissionFollowUpStatus | null;
    closedAt: string | null;
    actions: Array<{
      id: string;
      title: string;
      sourceType: MissionFollowUpSourceType;
      status: MissionFollowUpActionStatus;
      priority: MissionFollowUpPriority;
      ownerType: string;
      ownerName: string | null;
      dueAt: string | null;
      nextCheckAt: string | null;
      blockedReason: string | null;
      relatedPersonName: string | null;
      relatedOrganizationName: string | null;
    }>;
  };
};
