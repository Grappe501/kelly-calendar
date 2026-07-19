import "server-only";

import { buildCommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import { buildCountyOperationsHome } from "@/lib/missions/county-operations";
import { buildExecutiveCommand, type ExecutiveCommand } from "@/lib/missions/executive-command";
import { buildFieldOperationsHome } from "@/lib/missions/field-operations";
import { buildLogisticsOperationsHome } from "@/lib/missions/logistics-operations";
import { buildVolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

export type ExecutiveCommandPayload = {
  command: ExecutiveCommand;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/**
 * Authenticated Executive Command — consumes Field, County, Volunteer,
 * Communications, and Logistics feeds (no duplicate engines).
 */
export async function getExecutiveCommand(
  actor: AuthenticatedActor,
): Promise<ExecutiveCommandPayload> {
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
    };
  });

  const logistics = buildLogisticsOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
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
  });

  const volunteers = buildVolunteerOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
    communicationsConsume: communications.volunteerFeed,
    logisticsConsume: logistics.volunteerFeed,
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
  });

  const command = buildExecutiveCommand({
    brief: briefPayload.brief,
    missions: briefPayload.allMissionsToday,
    countiesByMission: briefPayload.countiesByMission,
    fieldFeed: field.executiveFeed,
    countyFeed: counties.executiveFeed,
    volunteerFeed: volunteers.executiveFeed,
    communicationsFeed: communications.executiveFeed,
    logisticsFeed: logistics.executiveFeed,
  });

  return {
    command,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
