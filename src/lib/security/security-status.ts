import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

export type SecurityCapabilityStatus = {
  headers: true;
  contentSecurityPolicy: "staged";
  permissionsPolicy: true;
  errorSanitization: true;
  requestIds: true;
  structuredLogging: true;
  rateLimitFoundation: true;
  rateLimitDistributed: false;
  cookieFoundation: true;
  redirectFoundation: true;
  originFoundation: true;
  csrfFoundation: true;
  authenticationComplete: boolean;
  candidateDataReady: false;
  databaseMutationsAuthorized: boolean;
};

export function getSecurityCapabilityStatus(): SecurityCapabilityStatus {
  const flags = getSharedAuthFlags();
  return {
    headers: true,
    contentSecurityPolicy: "staged",
    permissionsPolicy: true,
    errorSanitization: true,
    requestIds: true,
    structuredLogging: true,
    rateLimitFoundation: true,
    rateLimitDistributed: false,
    cookieFoundation: true,
    redirectFoundation: true,
    originFoundation: true,
    csrfFoundation: true,
    authenticationComplete: flags.authenticationComplete,
    candidateDataReady: false,
    databaseMutationsAuthorized: flags.databaseMutationsAuthorized,
  };
}
