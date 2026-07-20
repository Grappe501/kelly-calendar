export { MISSION_PROJECTION_VERSION } from "@/lib/missions/v21/constants";
export {
  projectEventToMission,
  projectLifecyclePhase,
  projectMissionStatus,
} from "@/lib/missions/v21/project-event-to-mission";
export {
  compareLegacyEventToMission,
  toLegacyEventSnapshot,
} from "@/lib/missions/v21/compare-legacy-projection";
export {
  validateCampaignMission,
  type MissionValidationIssue,
  type MissionValidationResult,
} from "@/lib/missions/v21/validate-mission";
export { MISSION_V21_SEED_SOURCES } from "@/lib/missions/v21/seed-examples";
export type {
  CampaignMission,
  EventMissionSource,
  LegacyEventSnapshot,
  MissionCompleteness,
  MissionIntelligence,
  MissionLifecyclePhase,
  MissionOperationalStatus,
  MissionProjectionComparison,
  MissionSuccessCriterion,
} from "@/lib/missions/v21/types";
