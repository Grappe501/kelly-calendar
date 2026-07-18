/**
 * Client-safe / shared honesty flags for Step 4.
 * Does not import server-only modules.
 */
export function isAuthInfrastructureReady(): boolean {
  const secret = process.env.APP_SESSION_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

export function getSharedAuthFlags() {
  const ready = isAuthInfrastructureReady();
  return {
    authenticationComplete: ready,
    sessionValidationAvailable: ready,
    databaseMutationsAuthorized: ready,
    candidateDataReady: false,
    candidateDataEntryAuthorized: false,
  } as const;
}
