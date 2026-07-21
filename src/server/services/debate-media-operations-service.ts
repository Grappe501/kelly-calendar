import "server-only";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

import {
  type DebateMediaOperationsHome,
} from "@/lib/missions/debate-media-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { assemblePhase1OpsStack } from "@/server/services/phase1-ops-stack";

export type DebateMediaOperationsPayload = {
  debateMedia: DebateMediaOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: boolean;
};

/** Authenticated Debate & Media Operations — public communication preparedness. */
export async function getDebateMediaOperations(
  actor: AuthenticatedActor,
): Promise<DebateMediaOperationsPayload> {
  const stack = await assemblePhase1OpsStack(actor);
  return {
    debateMedia: stack.debateMedia,
    viewerDisplayName: stack.briefPayload.viewerDisplayName,
    candidateDataReady: getSharedAuthFlags().candidateDataReady,
  };
}
