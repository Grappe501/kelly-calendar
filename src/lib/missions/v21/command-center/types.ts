import type { MissionCommandCenterConfig } from "@/lib/missions/v21/command-center/config";
import type { MissionDebriefStatus, MissionOutcomeAssessment } from "@/lib/missions/v21/debrief/types";
import type {
  MissionExecutionStatus,
} from "@/lib/missions/v21/execution/types";
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

export type AttentionSeverity = "CRITICAL" | "HIGH" | "NORMAL";

export type MissionAttentionReason =
  | "EXECUTION_NOT_STARTED"
  | "EXECUTION_OVERRUN"
  | "ARRIVED_NOT_BEGUN"
  | "PREPARATION_NOT_READY"
  | "DEBRIEF_NOT_STARTED"
  | "DEBRIEF_AWAITING_APPROVAL"
  | "URGENT_COMMITMENT_OVERDUE"
  | "IMPORTANT_COMMITMENT_OVERDUE"
  | "FOLLOW_UP_BLOCKED"
  | "FOLLOW_UP_UNASSIGNED"
  | "FOLLOW_UP_WAITING_REVIEW"
  | "MISSION_READY_TO_CLOSE"
  | "RECORD_INTEGRITY_REVIEW";

export type CommandCenterView =
  | "overview"
  | "attention"
  | "prepare"
  | "execute"
  | "debrief"
  | "follow-up"
  | "closeout";

export type MissionAttentionItem = {
  id: string;
  missionId: string;
  missionTitle: string;
  reason: MissionAttentionReason;
  severity: AttentionSeverity;
  severityLabel: string;
  label: string;
  explanation: string;
  phase: MissionLifecyclePhase;
  phaseLabel: string;
  timeContext: string | null;
  href: string;
  primaryActionLabel: string;
  relevantAt: string | null;
  rank: number;
};

export type MissionCommandItem = {
  missionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  whenLabel: string;
  locationLabel: string | null;
  lifecyclePhase: MissionLifecyclePhase;
  lifecyclePhaseLabel: string;
  operationalStatus: MissionOperationalStatus;
  preparationReadiness: PreparationReadinessState | null;
  executionStatus: MissionExecutionStatus | null;
  keyMessage: string | null;
  travelRequired: boolean;
  arrivedAt: string | null;
  startedAt: string | null;
  urgentOpenCount: number;
  primaryHref: string;
  primaryActionLabel: string;
};

export type MissionPreparationRiskItem = {
  missionId: string;
  title: string;
  startsAt: string;
  whenLabel: string;
  readiness: PreparationReadinessState | null;
  gaps: string[];
  hoursUntilStart: number;
  href: string;
};

export type MissionExecutionExceptionItem = {
  missionId: string;
  title: string;
  label: string;
  explanation: string;
  href: string;
};

export type MissionDebriefQueueItem = {
  missionId: string;
  title: string;
  eventWhenLabel: string;
  debriefStatus: MissionDebriefStatus | null;
  outcomeAssessment: MissionOutcomeAssessment | null;
  group: "NOT_STARTED" | "IN_PROGRESS" | "READY_FOR_APPROVAL" | "APPROVED_NEEDS_FOLLOW_UP";
  groupLabel: string;
  approvedFollowUpCount: number;
  ageLabel: string | null;
  href: string;
  primaryActionLabel: string;
  sortAt: string;
};

export type MissionFollowUpQueueItem = {
  actionId: string;
  missionId: string;
  missionTitle: string;
  title: string;
  sourceType: MissionFollowUpSourceType;
  sourceLabel: string;
  status: MissionFollowUpActionStatus;
  statusLabel: string;
  priority: MissionFollowUpPriority;
  ownerLabel: string;
  dueAt: string | null;
  dueLabel: string;
  relatedLabel: string | null;
  href: string;
  bucket:
    | "OVERDUE"
    | "DUE_TODAY"
    | "URGENT"
    | "BLOCKED"
    | "WAITING_REVIEW"
    | "UNASSIGNED";
};

export type MissionCommitmentWatchItem = MissionFollowUpQueueItem & {
  commitmentText: string;
};

export type MissionBlockedWorkItem = {
  actionId: string;
  missionId: string;
  missionTitle: string;
  title: string;
  blockedReason: string | null;
  ownerLabel: string;
  priority: MissionFollowUpPriority;
  href: string;
};

export type MissionCloseoutItem = {
  missionId: string;
  title: string;
  eventWhenLabel: string;
  outcomeAssessment: MissionOutcomeAssessment | null;
  completedCount: number;
  cancelledCount: number;
  closeoutSummaryPresent: boolean;
  readySince: string | null;
  href: string;
};

export type MissionClosedItem = {
  missionId: string;
  title: string;
  eventWhenLabel: string;
  outcomeAssessment: MissionOutcomeAssessment | null;
  closedAt: string;
  closedBy: string | null;
  completedCommitments: number;
  reportHref: string;
};

export type MissionCommandCenterSummary = {
  activeNow: number;
  needsAttention: number;
  upcomingSevenDays: number;
  preparationRisk: number;
  debriefPending: number;
  debriefAwaitingApproval: number;
  openFollowUps: number;
  overdueCommitments: number;
  blockedActions: number;
  readyToClose: number;
  recentlyClosed: number;
};

export type MissionCommandCenterViewModel = {
  generatedAt: string;
  campaignDate: string;
  campaignTimezone: string;
  config: MissionCommandCenterConfig;
  summary: MissionCommandCenterSummary;
  immediateAttention: MissionAttentionItem[];
  activeNow: MissionCommandItem[];
  comingNext: MissionCommandItem[];
  preparationRisk: MissionPreparationRiskItem[];
  executionExceptions: MissionExecutionExceptionItem[];
  debriefQueue: MissionDebriefQueueItem[];
  followUpAccountability: MissionFollowUpQueueItem[];
  commitments: MissionCommitmentWatchItem[];
  blockedWork: MissionBlockedWorkItem[];
  readyToClose: MissionCloseoutItem[];
  recentlyClosed: MissionClosedItem[];
  filters: {
    activeView: CommandCenterView;
    phase: MissionLifecyclePhase | null;
    search: string | null;
  };
  isolation: {
    readOnly: true;
    mutatesRecords: false;
    eventScheduleEditableHere: false;
  };
};

/** Intermediate mission snapshot used by pure rule functions (no Prisma). */
export type CommandCenterMissionSnapshot = {
  missionId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationLabel: string | null;
  lifecyclePhase: MissionLifecyclePhase;
  operationalStatus: MissionOperationalStatus;
  travelRequired: boolean;
  objective: string | null;
  preparation: {
    exists: boolean;
    readiness: PreparationReadinessState | null;
    strategicPurpose: string | null;
    keyMessage: string | null;
  };
  execution: {
    exists: boolean;
    status: MissionExecutionStatus | null;
    arrivedAt: string | null;
    startedAt: string | null;
    endedAt: string | null;
    observationCount: number;
    commitmentCount: number;
    followUpCount: number;
  };
  debrief: {
    exists: boolean;
    status: MissionDebriefStatus | null;
    outcomeAssessment: MissionOutcomeAssessment | null;
    approvedFollowUpCount: number;
    completedAt: string | null;
    approvedAt: string | null;
  };
  followUp: {
    exists: boolean;
    status: MissionFollowUpStatus | null;
    completedAt: string | null;
    closedAt: string | null;
    closedByUserId: string | null;
    closeoutSummary: string | null;
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
      waitingReason: string | null;
      blockedReason: string | null;
      relatedPersonName: string | null;
      relatedOrganizationName: string | null;
      sourceSnapshot: Record<string, unknown> | null;
    }>;
  };
};
