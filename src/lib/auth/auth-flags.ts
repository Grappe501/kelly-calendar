/**
 * Client-safe / shared honesty flags for auth + candidate-data certification.
 * Does not import server-only modules.
 */

/** Step 8 closeout certification — real campaign schedule data permitted when auth is ready. */
export const CANDIDATE_DATA_CERTIFICATION = {
  buildId: "KCCC-EA-8-SECURITY-CLOSEOUT-1.0",
  certifiedAt: "2026-07-21",
  /** Product gate: certified for authorized roles when session auth is configured. */
  certified: true as const,
} as const;

export function isAuthInfrastructureReady(): boolean {
  const secret = process.env.APP_SESSION_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

export function getSharedAuthFlags() {
  const ready = isAuthInfrastructureReady();
  const candidateReady = ready && CANDIDATE_DATA_CERTIFICATION.certified;
  return {
    authenticationComplete: ready,
    sessionValidationAvailable: ready,
    databaseMutationsAuthorized: ready,
    candidateDataReady: candidateReady,
    candidateDataEntryAuthorized: candidateReady,
    candidateDataCertificationBuildId: CANDIDATE_DATA_CERTIFICATION.buildId,
  } as const;
}
