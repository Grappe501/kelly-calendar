import "server-only";

import { buildExecutiveCommand, type ExecutiveCommand } from "@/lib/missions/executive-command";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { getCampaignBrief } from "@/server/services/campaign-brief-service";

export type ExecutiveCommandPayload = {
  command: ExecutiveCommand;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/**
 * Authenticated Executive Command Center — deterministic morning briefing.
 */
export async function getExecutiveCommand(
  actor: AuthenticatedActor,
): Promise<ExecutiveCommandPayload> {
  const briefPayload = await getCampaignBrief(actor);

  const command = buildExecutiveCommand({
    brief: briefPayload.brief,
    missions: briefPayload.allMissionsToday,
    countiesByMission: briefPayload.countiesByMission,
  });

  return {
    command,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
