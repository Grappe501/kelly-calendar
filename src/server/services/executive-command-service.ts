import "server-only";

import { buildCandidateOperationsHome } from "@/lib/missions/candidate-operations";
import { buildExecutiveCommand, type ExecutiveCommand } from "@/lib/missions/executive-command";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { assemblePhase1OpsStack } from "@/server/services/phase1-ops-stack";

export type ExecutiveCommandPayload = {
  command: ExecutiveCommand;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/**
 * Authenticated Executive Command — consumes Phase 1 kernel feeds plus
 * Phase 2 Candidate and Debate & Media orchestration. No duplicate engines.
 */
export async function getExecutiveCommand(
  actor: AuthenticatedActor,
): Promise<ExecutiveCommandPayload> {
  const stack = await assemblePhase1OpsStack(actor);
  const { briefPayload } = stack;

  const candidate = buildCandidateOperationsHome({
    brief: briefPayload.brief,
    missions: briefPayload.allMissionsToday,
    countiesByMission: briefPayload.countiesByMission,
    logistics: stack.logistics,
    communications: stack.communications,
    compliance: stack.compliance,
    constituents: stack.constituents,
    counties: stack.counties,
    field: stack.field,
    finance: stack.finance,
    volunteers: stack.volunteers,
    debateMediaConsume: stack.debateMedia,
  });

  const command = buildExecutiveCommand({
    brief: briefPayload.brief,
    missions: briefPayload.allMissionsToday,
    countiesByMission: briefPayload.countiesByMission,
    fieldFeed: stack.field.executiveFeed,
    countyFeed: stack.counties.executiveFeed,
    volunteerFeed: stack.volunteers.executiveFeed,
    communicationsFeed: stack.communications.executiveFeed,
    logisticsFeed: stack.logistics.executiveFeed,
    financeFeed: stack.finance.executiveFeed,
    complianceFeed: stack.compliance.executiveFeed,
    intelligenceFeed: stack.intelligence.executiveFeed,
    constituentFeed: stack.constituents.executiveFeed,
    candidateFeed: candidate.executiveFeed,
    debateMediaFeed: stack.debateMedia.executiveFeed,
  });

  return {
    command,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
