import type { MissionHomeViewModel } from "@/lib/missions/v21/mission-home-view-model";
import type {
  MissionPreparationRecord,
  PreparationReadinessCheck,
} from "@/lib/missions/v21/preparation/types";

export type PrepareWorkspaceView = {
  mission: MissionHomeViewModel;
  preparation: MissionPreparationRecord;
  readinessChecks: PreparationReadinessCheck[];
  /** Explicit: lifecycle phase is independent of preparation readiness. */
  lifecyclePhaseUnchangedByReadiness: true;
  eventScheduleEditableHere: false;
};
