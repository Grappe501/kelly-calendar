import "server-only";

import { formatCampaignDate } from "@/lib/dates/election";
import { getPublicAppConfig } from "@/lib/env/public-config";
import { projectLifecyclePhase } from "@/lib/missions/v21";
import {
  toMissionHomeViewModel,
  type MissionHomeViewModel,
  type TodaysMissionResult,
} from "@/lib/missions/v21/mission-home-view-model";
import { selectTodaysMission } from "@/lib/missions/v21/select-todays-mission";
import { getDebriefStatusByMissionId } from "@/server/repositories/mission-debrief-repository";
import {
  campaignMissionFromRow,
  getCampaignMissionById,
  listCampaignMissionsForTodaySelection,
} from "@/server/repositories/mission-repository";
import { NotFoundError } from "@/lib/security/safe-error";
import { prisma } from "@/server/db/prisma";

/**
 * Today’s Mission operating-surface service (V2.1 Deliverable 2).
 *
 * Selection uses MissionLifecyclePhase precedence only.
 * Do not substitute legacy Mission Card status (PENDING / IN_PROGRESS / …).
 */

async function buildViewModelForRow(
  row: Awaited<ReturnType<typeof listCampaignMissionsForTodaySelection>>[number],
  now: Date,
  campaignTimezone: string,
): Promise<MissionHomeViewModel> {
  const mission = campaignMissionFromRow(row);
  const travelRequired = row.sourceEvent.travelPlans.some((t) => t.travelRequired);
  const lifecyclePhase = projectLifecyclePhase({
    eventStatus: row.sourceEvent.status,
    startsAt: mission.startsAt,
    endsAt: mission.endsAt,
    travelRequired,
    hasOutcome: row.sourceEvent.outcomes.length > 0,
    followupCount: row.sourceEvent.followups.length,
    now,
  });
  const debriefStatus =
    lifecyclePhase === "DEBRIEF" && mission.id
      ? await getDebriefStatusByMissionId(mission.id)
      : null;

  return toMissionHomeViewModel({
    mission,
    lifecyclePhase,
    travelRequired,
    campaignTimezone,
    debriefStatus,
  });
}

export async function getTodaysMissionResult(options?: {
  now?: Date;
  timezone?: string;
}): Promise<TodaysMissionResult> {
  const config = getPublicAppConfig();
  const timezone = options?.timezone ?? config.campaignTimezone;
  const now = options?.now ?? new Date();
  const campaignDayLabel = formatCampaignDate(now, timezone);

  const rows = (
    await listCampaignMissionsForTodaySelection()
  ).filter((r) => r.sourceEvent.archivedAt == null);

  const viewModels = await Promise.all(
    rows.map((row) => buildViewModelForRow(row, now, timezone)),
  );
  const byId = new Map(viewModels.map((vm) => [vm.missionId, vm]));

  const selection = selectTodaysMission(
    viewModels.map((vm) => ({
      id: vm.missionId,
      startsAt: vm.startsAt,
      endsAt: vm.endsAt,
      lifecyclePhase: vm.lifecyclePhase,
    })),
    { now, timezone },
  );

  if (!selection.primaryId) {
    return {
      state: "EMPTY",
      primaryMission: null,
      nextMission: selection.nextId
        ? (byId.get(selection.nextId) ?? null)
        : null,
      selectionReason: "NO_MISSION",
      campaignDayLabel,
      timezone,
    };
  }

  const primary = byId.get(selection.primaryId);
  if (!primary) {
    return {
      state: "EMPTY",
      primaryMission: null,
      nextMission: null,
      selectionReason: "NO_MISSION",
      campaignDayLabel,
      timezone,
    };
  }

  return {
    state: "ACTIVE",
    primaryMission: primary,
    nextMission: selection.nextId
      ? (byId.get(selection.nextId) ?? null)
      : null,
    selectionReason: selection.selectionReason as Exclude<
      typeof selection.selectionReason,
      "NO_MISSION"
    >,
    campaignDayLabel,
    timezone,
  };
}

export async function getMissionHomeViewModelById(
  missionId: string,
  options?: { now?: Date },
): Promise<MissionHomeViewModel> {
  const row = await getCampaignMissionById(missionId);
  if (!row) throw new NotFoundError("Mission not found.");

  const event = await prisma.event.findUnique({
    where: { id: row.sourceEventId },
    select: {
      status: true,
      archivedAt: true,
      travelPlans: { select: { travelRequired: true } },
      outcomes: { select: { id: true }, take: 1 },
      followups: { select: { id: true } },
    },
  });
  if (!event || event.archivedAt) throw new NotFoundError("Mission not found.");

  const mission = campaignMissionFromRow(row);
  const travelRequired = event.travelPlans.some((t) => t.travelRequired);
  const now = options?.now ?? new Date();
  const lifecyclePhase = projectLifecyclePhase({
    eventStatus: event.status,
    startsAt: mission.startsAt,
    endsAt: mission.endsAt,
    travelRequired,
    hasOutcome: event.outcomes.length > 0,
    followupCount: event.followups.length,
    now,
  });
  const timezone = getPublicAppConfig().campaignTimezone;
  const debriefStatus =
    lifecyclePhase === "DEBRIEF" && mission.id
      ? await getDebriefStatusByMissionId(mission.id)
      : null;
  return toMissionHomeViewModel({
    mission,
    lifecyclePhase,
    travelRequired,
    campaignTimezone: timezone,
    debriefStatus,
  });
}
