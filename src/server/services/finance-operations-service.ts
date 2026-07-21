import "server-only";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

import { buildComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import {
  buildFinanceOperationsHome,
  type FinanceOperationsHome,
} from "@/lib/missions/finance-operations";
import { buildLogisticsOperationsHome } from "@/lib/missions/logistics-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

export type FinanceOperationsPayload = {
  finance: FinanceOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: boolean;
};

/** Authenticated Finance & Resources Operations — can we sustain the campaign? */
export async function getFinanceOperations(
  actor: AuthenticatedActor,
): Promise<FinanceOperationsPayload> {
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
      logistics: context.logistics.get(mission.missionId) ?? null,
      finance: context.finance.get(mission.missionId) ?? null,
      compliance: context.compliance.get(mission.missionId) ?? null,
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

  return {
    finance,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: getSharedAuthFlags().candidateDataReady,
  };
}
