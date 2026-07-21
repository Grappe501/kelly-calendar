import "server-only";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

import {
  buildConstituentOperationsHome,
  type ConstituentOperationsHome,
} from "@/lib/missions/constituent-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

export type ConstituentOperationsPayload = {
  constituents: ConstituentOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: boolean;
};

/** Authenticated Voter & Constituent Operations — relationship readiness. */
export async function getConstituentOperations(
  actor: AuthenticatedActor,
): Promise<ConstituentOperationsPayload> {
  const briefPayload = await getCampaignBrief(actor);
  const ids = briefPayload.allMissionsToday.map((m) => m.missionId);
  const context = await loadMissionContextForIds(ids);

  const constituents = buildConstituentOperationsHome({
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
        constituent: context.constituent.get(mission.missionId) ?? null,
      };
    }),
  });

  return {
    constituents,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: getSharedAuthFlags().candidateDataReady,
  };
}
