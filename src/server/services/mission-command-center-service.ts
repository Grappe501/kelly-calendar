import "server-only";

import {
  buildCommandCenterViewModel,
  DEFAULT_COMMAND_CENTER_CONFIG,
  parseCommandCenterFilters,
  type CommandCenterFilterInput,
  type MissionCommandCenterViewModel,
} from "@/lib/missions/v21/command-center";
import { getPublicAppConfig } from "@/lib/env/public-config";
import {
  countCommandCenterDiagnostics,
  listMissionsForCommandCenter,
} from "@/server/repositories/mission-command-center-repository";

/**
 * Mission Command Center service (V2.1 Deliverable 7).
 * Read-only aggregation. Does not mutate Mission, Event, or phase records.
 */
export async function getMissionCommandCenter(options?: {
  now?: Date;
  filters?: CommandCenterFilterInput;
}): Promise<MissionCommandCenterViewModel> {
  const config = DEFAULT_COMMAND_CENTER_CONFIG;
  const now = options?.now ?? new Date();
  const campaignTimezone = getPublicAppConfig().campaignTimezone;
  const filters = parseCommandCenterFilters(options?.filters ?? {});

  const missions = await listMissionsForCommandCenter({
    now,
    upcomingWindowDays: config.upcomingWindowDays,
    recentlyClosedWindowDays: config.recentlyClosedWindowDays,
  });

  return buildCommandCenterViewModel({
    missions,
    now,
    campaignTimezone,
    filters,
    config,
  });
}

export async function getCommandCenterDataReport(options?: { now?: Date }) {
  const vm = await getMissionCommandCenter({ now: options?.now });
  const diagnostics = await countCommandCenterDiagnostics();
  return {
    ...diagnostics,
    activeMissionCount: vm.summary.activeNow,
    upcomingMissionCount: vm.comingNext.length,
    preparationRiskCount: vm.summary.preparationRisk,
    executionExceptionCount: vm.executionExceptions.length,
    debriefNotStartedCount: vm.debriefQueue.filter((d) => d.group === "NOT_STARTED")
      .length,
    debriefInProgressCount: vm.debriefQueue.filter((d) => d.group === "IN_PROGRESS")
      .length,
    debriefAwaitingApprovalCount: vm.summary.debriefAwaitingApproval,
    openFollowUpActionCount: vm.summary.openFollowUps,
    overdueCommitmentCount: vm.summary.overdueCommitments,
    blockedActionCount: vm.summary.blockedActions,
    unassignedRequiredActionCount: vm.followUpAccountability.filter(
      (a) => a.bucket === "UNASSIGNED",
    ).length,
    readyToCloseMissionCount: vm.summary.readyToClose,
    recentlyClosedMissionCount: vm.summary.recentlyClosed,
    dataIntegrityWarningCount: vm.immediateAttention.filter(
      (a) => a.reason === "RECORD_INTEGRITY_REVIEW",
    ).length,
  };
}
