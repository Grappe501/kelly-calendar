import "server-only";

import { getAuthProviderStatus } from "@/server/auth/provider";
import { getSharedAuthFlags, isAuthInfrastructureReady } from "@/lib/auth/auth-flags";

/**
 * Step 4 AUTH-RBAC status.
 * authenticationComplete reflects that the auth module is implemented and
 * session signing is configured. Candidate PII entry stays separately gated.
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
    candidateDataEntryAuthorized: false,
    reason: complete
      ? "Step 4 AUTH-RBAC active (app sessions + RBAC)"
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
