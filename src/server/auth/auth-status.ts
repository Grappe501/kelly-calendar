import "server-only";

/**
 * Honest auth status until Step 4 lands.
 * Do not fabricate sessions or roles.
 */
export const AUTH_STATUS = {
  step4Complete: false,
  authenticationComplete: false,
  sessionValidationAvailable: false,
  mutationApisAuthorized: false,
  candidateDataEntryAuthorized: false,
  reason: "KCCC-STEP-04-AUTH-RBAC not implemented",
} as const;

export function assertMutationsAuthorized(): never {
  throw Object.assign(new Error(AUTH_STATUS.reason), {
    code: "AUTHENTICATION_REQUIRED",
    status: 401,
    publicMessage:
      "Authentication and RBAC are not complete. Database mutations remain disabled.",
  });
}

export function getViewerIdentity(): null {
  return null;
}
