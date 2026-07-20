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
export {
  labelMissionLifecyclePhase,
  labelMissionOperationalStatus,
} from "@/lib/missions/v21/labels";
export {
  selectTodaysMission,
  campaignDateKey,
  type TodaysMissionCandidate,
  type TodaysMissionSelection,
} from "@/lib/missions/v21/select-todays-mission";
export {
  toMissionHomeViewModel,
  primaryActionForPhase,
  type MissionHomeViewModel,
  type TodaysMissionResult,
  type TodaysMissionSelectionReason,
} from "@/lib/missions/v21/mission-home-view-model";
export * from "@/lib/missions/v21/preparation";
export * from "@/lib/missions/v21/execution";
export * from "@/lib/missions/v21/debrief";
export * from "@/lib/missions/v21/follow-up";
export * from "@/lib/missions/v21/command-center";
export * from "@/lib/missions/v21/day-briefing";
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
