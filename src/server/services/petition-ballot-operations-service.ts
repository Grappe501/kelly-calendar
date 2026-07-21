import "server-only";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

import type { PetitionBallotOperationsHome } from "@/lib/missions/petition-ballot-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { assemblePhase1OpsStack } from "@/server/services/phase1-ops-stack";

export type PetitionBallotOperationsPayload = {
  petition: PetitionBallotOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: boolean;
};

/** Authenticated Petition & Ballot Operations — qualification workflow. */
export async function getPetitionBallotOperations(
  actor: AuthenticatedActor,
): Promise<PetitionBallotOperationsPayload> {
  const stack = await assemblePhase1OpsStack(actor);
  return {
    petition: stack.petition,
    viewerDisplayName: stack.briefPayload.viewerDisplayName,
    candidateDataReady: getSharedAuthFlags().candidateDataReady,
  };
}
