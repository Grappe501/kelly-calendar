import "server-only";

import {
  buildFieldOperationsHome,
  type FieldOperationsHome,
} from "@/lib/missions/field-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

export type FieldOperationsPayload = {
  field: FieldOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/**
 * Authenticated Field Operations — mission execution help queue.
 * Consumes brief/mission/readiness contracts; produces executiveFeed.
 */
export async function getFieldOperations(
  actor: AuthenticatedActor,
): Promise<FieldOperationsPayload> {
  const briefPayload = await getCampaignBrief(actor);
  const ids = briefPayload.allMissionsToday.map((m) => m.missionId);
  const context = await loadMissionContextForIds(ids);

  const field = buildFieldOperationsHome({
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
        staffAssignedCount: geo?.staffAssignedCount ?? 0,
        staffRequiredCount: geo?.staffRequiredCount ?? 0,
        readiness: mission.todayReadiness,
      };
    }),
  });

  return {
    field,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
