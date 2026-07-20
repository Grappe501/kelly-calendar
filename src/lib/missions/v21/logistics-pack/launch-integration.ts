import { DEFAULT_LOGISTICS_PACK_CONFIG } from "@/lib/missions/v21/logistics-pack/logistics-config";
import { evaluateLogisticsFindings } from "@/lib/missions/v21/logistics-pack/readiness";
import type {
  LogisticsMissionContext,
  MissionLogisticsPackPersisted,
} from "@/lib/missions/v21/logistics-pack/types";
import type { DayBriefingMissionSnapshot } from "@/lib/missions/v21/day-briefing/types";
import type {
  CampaignDayLaunchAcknowledgementPersisted,
  CampaignDayLaunchAcknowledgementStatus,
  LaunchBlocker,
} from "@/lib/missions/v21/day-launch/types";

function ackStatus(
  acknowledgements: CampaignDayLaunchAcknowledgementPersisted[],
  key: string,
): CampaignDayLaunchAcknowledgementStatus | null {
  return acknowledgements.find((a) => a.importKey === key)?.status ?? null;
}

/**
 * Map logistics BLOCKER findings into Morning Launch Review blockers.
 * Uses stored pack facts only. Does not create packs or confirm logistics.
 * Completing launch review / launching the day never mutates logistics.
 */
export function buildLogisticsLaunchBlockers(input: {
  dayMissions: DayBriefingMissionSnapshot[];
  packsByMissionId: Map<string, MissionLogisticsPackPersisted>;
  acknowledgements: CampaignDayLaunchAcknowledgementPersisted[];
  campaignDateKey: string;
}): LaunchBlocker[] {
  const blockers: LaunchBlocker[] = [];
  for (const mission of input.dayMissions) {
    if (mission.operationalStatus === "CANCELLED") continue;
    const pack = input.packsByMissionId.get(mission.missionId) ?? null;
    const context: LogisticsMissionContext = {
      missionId: mission.missionId,
      title: mission.title,
      startsAt: mission.startsAt,
      endsAt: mission.endsAt,
      timezone: mission.timezone,
      locationLabel: mission.locationLabel,
      campaignDateKey: input.campaignDateKey,
      lifecyclePhase: mission.lifecyclePhase,
      operationalStatus: mission.operationalStatus,
      isCancelled: false,
      materialsIndicated: mission.preparation.materialsNeeded.length > 0,
      travelPlannedDepartureAt:
        mission.missionTravelPlan?.plannedDepartureAt ?? null,
    };
    const findings = evaluateLogisticsFindings({
      context,
      pack,
      config: DEFAULT_LOGISTICS_PACK_CONFIG,
    });
    for (const finding of findings) {
      if (finding.severity !== "BLOCKER") continue;
      if (finding.clearsForReadiness) continue;
      const key = `LOGISTICS:${finding.issueKey}`;
      blockers.push({
        id: key,
        title: finding.title,
        explanation: finding.explanation,
        missionId: mission.missionId,
        acknowledgementImportKey: key,
        acknowledgementStatus: ackStatus(input.acknowledgements, key),
        href: `/system/missions/${mission.missionId}/logistics`,
      });
    }
  }
  return blockers;
}
