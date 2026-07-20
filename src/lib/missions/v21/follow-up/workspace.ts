import type { CloseoutCheck } from "@/lib/missions/v21/follow-up/closeout";
import type { FollowUpAccountabilitySummary } from "@/lib/missions/v21/follow-up/summary";
import type {
  MissionFollowUpActionRecord,
  MissionFollowUpRecord,
} from "@/lib/missions/v21/follow-up/types";
import type {
  MissionDebriefStatus,
  MissionOutcomeAssessment,
} from "@/lib/missions/v21/debrief/types";
import type { MissionHomeViewModel } from "@/lib/missions/v21/mission-home-view-model";

export type MissionFollowUpActionViewModel = MissionFollowUpActionRecord & {
  sourceLabel: string;
  statusLabel: string;
  priorityLabel: string;
  ownerLabel: string;
  dueLabel: string;
  isOverdue: boolean;
  isDueToday: boolean;
};

export type MissionFollowUpViewModel = {
  mission: MissionHomeViewModel;
  debrief: {
    status: MissionDebriefStatus | null;
    outcomeAssessment: MissionOutcomeAssessment | null;
    outcomeSummary: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
    exists: boolean;
  };
  followUp: MissionFollowUpRecord;
  summary: FollowUpAccountabilitySummary;
  nextRequiredAction: MissionFollowUpActionViewModel | null;
  commitments: MissionFollowUpActionViewModel[];
  relationshipActions: MissionFollowUpActionViewModel[];
  unresolvedQuestions: MissionFollowUpActionViewModel[];
  otherActions: MissionFollowUpActionViewModel[];
  blockedActions: MissionFollowUpActionViewModel[];
  waitingActions: MissionFollowUpActionViewModel[];
  completedActions: MissionFollowUpActionViewModel[];
  cancelledActions: MissionFollowUpActionViewModel[];
  closeoutChecklist: CloseoutCheck[];
  importEligibleCount: number;
  lastImportResult: {
    imported: number;
    alreadyPresent: number;
    failed: number;
  } | null;
  isolation: {
    lifecyclePhaseUnchangedByFollowUp: true;
    operationalStatusUnchangedByFollowUp: true;
    preparationReadOnly: true;
    executionReadOnly: true;
    debriefReadOnly: true;
    eventScheduleEditableHere: false;
  };
};
