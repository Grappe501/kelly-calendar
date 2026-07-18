/**
 * Production fail-closed rules for APP_SESSION_SECRET.
 * Never log or return the secret value.
 */

const FORBIDDEN_PRODUCTION_SECRETS = [
  "KcccDevOnly-ChangeMe-Step4!",
  "unit-test-session-secret-do-not-use-in-prod",
  "dev-only",
  "changeme",
] as const;

export function isProductionAuthRuntime(): boolean {
  return (
    process.env.NETLIFY === "true" ||
    process.env.CONTEXT === "production" ||
    process.env.NODE_ENV === "production"
  );
}

export function classifyAppSessionSecret(secret: string | undefined | null): {
  present: boolean;
  lengthOk: boolean;
  productionSafe: boolean;
  reason: string;
} {
  const value = secret?.trim() ?? "";
  if (!value) {
    return {
      present: false,
      lengthOk: false,
      productionSafe: false,
      reason: "missing",
    };
  }
  if (value.length < 32) {
    return {
      present: true,
      lengthOk: false,
      productionSafe: false,
      reason: "too_short",
    };
  }
  const lowered = value.toLowerCase();
  for (const forbidden of FORBIDDEN_PRODUCTION_SECRETS) {
    if (value === forbidden || lowered.includes(forbidden.toLowerCase())) {
      return {
        present: true,
        lengthOk: true,
        productionSafe: false,
        reason: "development_default_or_forbidden",
      };
    }
  }
  if (lowered.includes("unit-test-session")) {
    return {
      present: true,
      lengthOk: true,
      productionSafe: false,
      reason: "test_secret",
    };
  }
  return {
    present: true,
    lengthOk: true,
    productionSafe: true,
    reason: "ok",
  };
}

/** Throws a safe Error (no secret value) when production secret is invalid. */
export function assertProductionSessionSecretOrThrow(
  secret: string | undefined | null,
): void {
  if (!isProductionAuthRuntime()) return;
  const c = classifyAppSessionSecret(secret);
  if (!c.productionSafe) {
    throw new Error(
      `APP_SESSION_SECRET is required and must be production-safe (${c.reason}).`,
    );
  }
}
