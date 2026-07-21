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
  candidateDataReady: boolean;
  databaseMutationsAuthorized: boolean;
  candidateDataCertificationBuildId: string;
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
    candidateDataReady: flags.candidateDataReady,
    databaseMutationsAuthorized: flags.databaseMutationsAuthorized,
    candidateDataCertificationBuildId: flags.candidateDataCertificationBuildId,
  };
}
