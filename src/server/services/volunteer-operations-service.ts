import "server-only";

import {
  buildVolunteerOperationsHome,
  type VolunteerOperationsHome,
} from "@/lib/missions/volunteer-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

export type VolunteerOperationsPayload = {
  volunteers: VolunteerOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/**
 * Authenticated Volunteer Operations — operational capacity, not CRM.
 * Owns fill/open-role facts; roster pool remains first-class Unknown.
 */
export async function getVolunteerOperations(
  actor: AuthenticatedActor,
): Promise<VolunteerOperationsPayload> {
  const briefPayload = await getCampaignBrief(actor);
  const ids = briefPayload.allMissionsToday.map((m) => m.missionId);
  const context = await loadMissionContextForIds(ids);

  const volunteers = buildVolunteerOperationsHome({
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
        volunteerLeadAssigned: geo?.volunteerLeadAssigned ?? false,
      };
    }),
  });

  return {
    volunteers,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
