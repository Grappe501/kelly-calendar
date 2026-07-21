import "server-only";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

import { buildCommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import { buildFinanceOperationsHome } from "@/lib/missions/finance-operations";
import { buildLogisticsOperationsHome } from "@/lib/missions/logistics-operations";
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
  candidateDataReady: boolean;
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
      logistics: context.logistics.get(mission.missionId) ?? null,
      finance: context.finance.get(mission.missionId) ?? null,
    };
  });

  const logistics = buildLogisticsOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
  });

  const opsByMission = new Map(
    logistics.missionRows.map((m) => [m.missionId, m.missionReadiness]),
  );

  const finance = buildFinanceOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs.map((row) => ({
      mission: row.mission,
      countyName: row.countyName,
      finance: row.finance,
      operationalState: opsByMission.get(row.mission.missionId) ?? "UNKNOWN",
    })),
  });

  const communications = buildCommunicationsOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
    logisticsConsume: {
      literatureAvailable: String(logistics.communicationsFeed.literatureAvailable),
      signageStatus: String(logistics.communicationsFeed.signageStatus),
      mediaKitDelivered: logistics.communicationsFeed.mediaKitDelivered,
      pressBackdropAvailable: logistics.communicationsFeed.pressBackdropAvailable,
    },
    financeConsume: finance.communicationsFeed,
  });

  const volunteers = buildVolunteerOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
    communicationsConsume: communications.volunteerFeed,
    logisticsConsume: logistics.volunteerFeed,
    financeConsume: finance.volunteerFeed,
  });

  return {
    volunteers,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: getSharedAuthFlags().candidateDataReady,
  };
}
