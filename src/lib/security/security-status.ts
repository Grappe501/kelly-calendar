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
  authenticationComplete: false;
  candidateDataReady: false;
  databaseMutationsAuthorized: false;
};

export function getSecurityCapabilityStatus(): SecurityCapabilityStatus {
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
    authenticationComplete: false,
    candidateDataReady: false,
    databaseMutationsAuthorized: false,
  };
}
