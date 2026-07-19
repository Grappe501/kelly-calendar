import "server-only";

import type { GotvOperationsHome } from "@/lib/missions/gotv-operations";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { assemblePhase1OpsStack } from "@/server/services/phase1-ops-stack";

export type GotvOperationsPayload = {
  gotv: GotvOperationsHome;
  viewerDisplayName: string;
  candidateDataReady: false;
};

/** Authenticated GOTV Operations — turnout conversion workflow. */
export async function getGotvOperations(
  actor: AuthenticatedActor,
): Promise<GotvOperationsPayload> {
  const stack = await assemblePhase1OpsStack(actor);
  return {
    gotv: stack.gotv,
    viewerDisplayName: stack.briefPayload.viewerDisplayName,
    candidateDataReady: false,
  };
}
