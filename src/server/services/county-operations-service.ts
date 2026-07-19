import "server-only";

import {
  buildCountyOperationsHome,
  type CountyOperationsHome,
} from "@/lib/missions/county-operations";
import { buildFieldOperationsHome } from "@/lib/missions/field-operations";
import { buildVolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

export type CountyOperationsPayload = {
  counties: CountyOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/**
 * Authenticated County Operations — statewide weakness / health.
 * Consumes Field heat + Volunteer capacity feed; produces executiveFeed.
 */
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
    };
  });

  const volunteers = buildVolunteerOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
  });

  const field = buildFieldOperationsHome({
    date: briefPayload.brief.date,
    timezone: briefPayload.brief.timezone,
    missions: missionInputs,
    volunteerFieldFeed: volunteers.fieldFeed.missions,
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
  });

  return {
    counties,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
