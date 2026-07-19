import "server-only";

import {
  buildCandidateOperationsHome,
  type CandidateOperationsHome,
} from "@/lib/missions/candidate-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { assemblePhase1OpsStack } from "@/server/services/phase1-ops-stack";

export type CandidateOperationsPayload = {
  candidate: CandidateOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/** Authenticated Candidate Operations — orchestrates Phase 1 + Phase 2 feeds. */
export async function getCandidateOperations(
  actor: AuthenticatedActor,
): Promise<CandidateOperationsPayload> {
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
    fundraisingConsume: stack.fundraising,
    gotvConsume: stack.gotv,
    petitionConsume: stack.petition,
  });

  return {
    candidate,
    viewerDisplayName: briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
