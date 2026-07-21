import "server-only";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

import type { FundraisingOperationsHome } from "@/lib/missions/fundraising-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { assemblePhase1OpsStack } from "@/server/services/phase1-ops-stack";

export type FundraisingOperationsPayload = {
  fundraising: FundraisingOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: boolean;
};

/** Authenticated Fundraising Operations — resource-generation workflow. */
export async function getFundraisingOperations(
  actor: AuthenticatedActor,
): Promise<FundraisingOperationsPayload> {
  const stack = await assemblePhase1OpsStack(actor);
  return {
    fundraising: stack.fundraising,
    viewerDisplayName: stack.briefPayload.viewerDisplayName,
    candidateDataReady: getSharedAuthFlags().candidateDataReady,
  };
}
