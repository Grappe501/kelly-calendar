import "server-only";

import {
  buildLogisticsOperationsHome,
  type LogisticsOperationsHome,
} from "@/lib/missions/logistics-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

export type LogisticsOperationsPayload = {
  logistics: LogisticsOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/** Authenticated Logistics Operations — can we execute today's plan? */
export async function getLogisticsOperations(
  actor: AuthenticatedActor,
): Promise<LogisticsOperationsPayload> {
  const briefPayload = await getCampaignBrief(actor);
  const ids = briefPayload.allMissionsToday.map((m) => m.missionId);
  const context = await loadMissionContextForIds(ids);

  const logistics = buildLogisticsOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: briefPayload.allMissionsToday.map((mission) => {
      const geo = context.geo.get(mission.missionId);
      return {
        mission,
        countyName:
          briefPayload.countiesByMission.find((c) => c.missionId === mission.missionId)
            ?.countyName ??
          geo?.countyName ??
          null,
        logistics: context.logistics.get(mission.missionId) ?? null,
      };
    }),
  });

  return {
    logistics,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
