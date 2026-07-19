import "server-only";

import { buildCommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import {
  buildCountyOperationsHome,
  type CountyOperationsHome,
} from "@/lib/missions/county-operations";
import { buildFieldOperationsHome } from "@/lib/missions/field-operations";
import { buildFinanceOperationsHome } from "@/lib/missions/finance-operations";
import { buildLogisticsOperationsHome } from "@/lib/missions/logistics-operations";
import { buildVolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

export type CountyOperationsPayload = {
  counties: CountyOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: false;
};

export async function getCountyOperations(
  actor: AuthenticatedActor,
): Promise<CountyOperationsPayload> {
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
      readiness: mission.todayReadiness,
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

  const field = buildFieldOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
    volunteerFieldFeed: volunteers.fieldFeed.missions,
    communicationsFieldFeed: communications.fieldFeed.missions,
    logisticsFieldFeed: logistics.fieldFeed.missions,
  });

  const counties = buildCountyOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
    fieldHeat: field.operationalHeat,
    fieldHelp: field.helpQueue.map((h) => ({
      countyLabel: h.countyLabel,
      detail: h.detail,
      severity: h.severity,
    })),
    volunteerFeed: volunteers.countyFeed,
    communicationsFeed: communications.countyFeed,
    logisticsFeed: logistics.countyFeed,
    financeFeed: finance.countyFeed,
  });

  return {
    counties,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
