import "server-only";

import { buildCommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import { buildComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import { buildConstituentOperationsHome } from "@/lib/missions/constituent-operations";
import { buildCountyOperationsHome } from "@/lib/missions/county-operations";
import { buildFieldOperationsHome } from "@/lib/missions/field-operations";
import { buildFinanceOperationsHome } from "@/lib/missions/finance-operations";
import {
  buildOperationalIntelligenceHome,
  type OperationalIntelligenceHome,
} from "@/lib/missions/intelligence-operations";
import { buildLogisticsOperationsHome } from "@/lib/missions/logistics-operations";
import { buildVolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

export type IntelligenceOperationsPayload = {
  intelligence: OperationalIntelligenceHome;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/**
 * Authenticated Operational Intelligence — interprets domain feeds only.
 * Does not own or override canonical operational facts.
 */
export async function getOperationalIntelligence(
  actor: AuthenticatedActor,
): Promise<IntelligenceOperationsPayload> {
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
      compliance: context.compliance.get(mission.missionId) ?? null,
      constituent: context.constituent.get(mission.missionId) ?? null,
    };
  });

  const constituents = buildConstituentOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
  });

  const logistics = buildLogisticsOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
  });

  const opsByMission = new Map(
    logistics.missionRows.map((m) => [m.missionId, m.missionReadiness]),
  );

  const financeBase = buildFinanceOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs.map((row) => ({
      mission: row.mission,
      countyName: row.countyName,
      finance: row.finance,
      operationalState: opsByMission.get(row.mission.missionId) ?? "UNKNOWN",
    })),
  });

  const resourceByMission = new Map(
    financeBase.missionRows.map((m) => [m.missionId, m.dual.resourceState]),
  );

  const compliance = buildComplianceOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs.map((row) => ({
      mission: row.mission,
      countyName: row.countyName,
      compliance: row.compliance,
      operationalState: opsByMission.get(row.mission.missionId) ?? "UNKNOWN",
      resourceState: resourceByMission.get(row.mission.missionId) ?? "UNKNOWN",
    })),
  });

  const finance = buildFinanceOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs.map((row) => ({
      mission: row.mission,
      countyName: row.countyName,
      finance: row.finance,
      operationalState: opsByMission.get(row.mission.missionId) ?? "UNKNOWN",
    })),
    complianceConsume: compliance.financeFeed,
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
    complianceConsume: compliance.communicationsFeed,
    constituentConsume: constituents.communicationsFeed,
  });

  const volunteers = buildVolunteerOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
    communicationsConsume: communications.volunteerFeed,
    logisticsConsume: logistics.volunteerFeed,
    financeConsume: finance.volunteerFeed,
    constituentConsume: constituents.volunteerFeed,
  });

  const field = buildFieldOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
    volunteerFieldFeed: volunteers.fieldFeed.missions,
    communicationsFieldFeed: communications.fieldFeed.missions,
    logisticsFieldFeed: logistics.fieldFeed.missions,
    complianceFieldFeed: compliance.fieldFeed.missions,
    constituentFieldFeed: constituents.fieldFeed.missions.map((m) => ({
      missionId: m.missionId,
      neighborhoodEngagementNeeds: m.neighborhoodEngagementNeeds,
      constituentFollowups: m.constituentFollowups.value,
      assignedOutreachTargetsStatus: m.assignedOutreachTargets.status,
    })),
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
    complianceFeed: compliance.countyFeed,
    constituentFeed: constituents.countyFeed,
  });

  const intelligence = buildOperationalIntelligenceHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    feeds: {
      fieldFeed: field.executiveFeed,
      countyFeed: counties.executiveFeed,
      volunteerFeed: volunteers.executiveFeed,
      communicationsFeed: communications.executiveFeed,
      logisticsFeed: logistics.executiveFeed,
      financeFeed: finance.executiveFeed,
      complianceFeed: compliance.executiveFeed,
      constituentFeed: constituents.executiveFeed,
    },
  });

  return {
    intelligence,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
