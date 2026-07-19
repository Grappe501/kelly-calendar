import "server-only";

import {
  buildCommunicationsOperationsHome,
  type CommunicationsOperationsHome,
} from "@/lib/missions/communications-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

export type CommunicationsOperationsPayload = {
  communications: CommunicationsOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/**
 * Authenticated Communications Operations — plan readiness, not a send client.
 */
export async function getCommunicationsOperations(
  actor: AuthenticatedActor,
): Promise<CommunicationsOperationsPayload> {
  const briefPayload = await getCampaignBrief(actor);
  const ids = briefPayload.allMissionsToday.map((m) => m.missionId);
  const context = await loadMissionContextForIds(ids);

  const communications = buildCommunicationsOperationsHome({
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
        comms: context.comms.get(mission.missionId) ?? null,
      };
    }),
  });

  return {
    communications,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
