import type { MissionHomeViewModel } from "@/lib/missions/v21/mission-home-view-model";
import type { MissionPreparationRecord } from "@/lib/missions/v21/preparation/types";
import type { MissionExecutionRecord } from "@/lib/missions/v21/execution/types";

export type MissionExecuteViewModel = {
  mission: MissionHomeViewModel;
  preparation: {
    readiness: MissionPreparationRecord["readinessState"] | null;
    strategicPurpose: string | null;
    keyMessage: string | null;
    successCriteria: string[];
    people: MissionPreparationRecord["peopleBriefings"];
    organizations: MissionPreparationRecord["organizationBriefings"];
  };
  execution: MissionExecutionRecord;
  /** Explicit isolation flags for UI + tests */
  lifecyclePhaseUnchangedByExecution: true;
  operationalStatusUnchangedByExecution: true;
  preparationReadOnly: true;
  eventScheduleEditableHere: false;
};
