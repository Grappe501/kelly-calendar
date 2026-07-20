import type { DebriefChecklistItem } from "@/lib/missions/v21/debrief/checklist";
import type {
  MissionDebriefRecord,
  MissionDebriefStatus,
  MissionOutcomeAssessment,
} from "@/lib/missions/v21/debrief/types";
import type { MissionExecutionRecord } from "@/lib/missions/v21/execution/types";
import type { MissionHomeViewModel } from "@/lib/missions/v21/mission-home-view-model";
import type {
  PreparationOrganizationBriefing,
  PreparationPersonBriefing,
  PreparationReadinessState,
} from "@/lib/missions/v21/preparation/types";

export type MissionDebriefViewModel = {
  mission: MissionHomeViewModel;
  preparation: {
    readiness: PreparationReadinessState | null;
    strategicPurpose: string | null;
    keyMessage: string | null;
    people: PreparationPersonBriefing[];
    organizations: PreparationOrganizationBriefing[];
    preparationTasks: unknown[];
    materialsNeeded: unknown[];
    logisticsNotes: string | null;
  };
  execution: {
    status: MissionExecutionRecord["executionStatus"] | null;
    exists: boolean;
    arrivedAt: string | null;
    startedAt: string | null;
    endedAt: string | null;
    arrivalNote: string | null;
    observations: MissionExecutionRecord["liveObservations"];
    peopleContacts: MissionExecutionRecord["peopleContacts"];
    organizationContacts: MissionExecutionRecord["organizationContacts"];
    commitments: MissionExecutionRecord["commitments"];
    immediateFollowUps: MissionExecutionRecord["immediateFollowUps"];
    fieldNotes: string | null;
  };
  debrief: MissionDebriefRecord;
  checklist: DebriefChecklistItem[];
  presentationSummary: string;
  isolation: {
    lifecyclePhaseUnchangedByDebrief: true;
    operationalStatusUnchangedByDebrief: true;
    preparationReadOnly: true;
    executionReadOnly: true;
    eventScheduleEditableHere: false;
  };
};

export type { MissionDebriefStatus, MissionOutcomeAssessment };
