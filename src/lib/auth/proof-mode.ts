/**
 * Deployment-proof mode flag. Off by default.
 * Does not bypass auth, RBAC, versioning, audit, or projections.
 */
export function isDeploymentProofModeEnabled(): boolean {
  return process.env.KCCC_DEPLOYMENT_PROOF_MODE === "true";
}

export function proofModeLabels() {
  return {
    enabled: isDeploymentProofModeEnabled(),
    proofStep: "KCCC-STEP-05.7",
    candidateData: false,
    bypassesSecurity: false,
  } as const;
}
