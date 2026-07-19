import "server-only";

import { buildCommunicationsOperationsHome } from "@/lib/missions/communications-operations";
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

export async function getVolunteerOperations(
  actor: AuthenticatedActor,
): Promise<VolunteerOperationsPayload> {
  const briefPayload = await getCampaignBrief(actor);
  const ids = briefPayload.allMissionsToday.map((m) => m.missionId);
  const context = await loadMissionContextForIds(ids);

  const missionInputs = briefPayload.allMissionsToday.map((mission) => {
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
      comms: context.comms.get(mission.missionId) ?? null,
    };
  });

  const communications = buildCommunicationsOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
  });

  const volunteers = buildVolunteerOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
    communicationsConsume: communications.volunteerFeed,
  });

  return {
    volunteers,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
