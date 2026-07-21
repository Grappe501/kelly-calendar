import "server-only";

import { getAuthProviderStatus } from "@/server/auth/provider";
import { getSharedAuthFlags, isAuthInfrastructureReady } from "@/lib/auth/auth-flags";

/**
 * Auth + candidate-data status.
 * authenticationComplete = session signing configured + login enabled.
 * candidateDataEntryAuthorized = Step 8 closeout certified AND auth ready.
 */
export function refreshAuthStatus() {
  const provider = getAuthProviderStatus();
  const flags = getSharedAuthFlags();
  const complete = flags.authenticationComplete && provider.loginEnabled;
  return {
    step4Complete: complete,
    authenticationComplete: complete,
    sessionValidationAvailable: complete,
    mutationApisAuthorized: complete,
    candidateDataEntryAuthorized: flags.candidateDataEntryAuthorized && complete,
    candidateDataReady: flags.candidateDataReady && complete,
    reason: complete
      ? flags.candidateDataReady
        ? "Auth active; candidate-data certified (EA-8 closeout)"
        : "Auth active; candidate-data not certified"
      : "APP_SESSION_SECRET missing or too short — auth not ready",
    provider,
  } as const;
}

export const AUTH_STATUS = refreshAuthStatus();

export function assertMutationsAuthorized(): void {
  const status = refreshAuthStatus();
  if (!status.mutationApisAuthorized) {
    throw Object.assign(new Error(status.reason), {
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
      publicMessage:
        "Authentication and RBAC are not ready. Database mutations remain disabled.",
    });
  }
}

export async function getViewerIdentity() {
  if (!isAuthInfrastructureReady()) return null;
  const { getSessionViewer } = await import("@/server/auth/session");
  return getSessionViewer();
}
