import { credentialPresent } from "@/lib/missions/v21/communications/providers/base/provider-health";
import type { CredentialCheck } from "@/lib/missions/v21/communications/providers/base/provider-types";

/**
 * Credential vault (D22 Phase 7) — environment variables only.
 * Never persist secret values to the database.
 */
export const PROVIDER_CREDENTIAL_ENV_KEYS = [
  "KCCC_RESEND_API_KEY",
  "KCCC_RESEND_WEBHOOK_SECRET",
  "KCCC_RESEND_FROM_EMAIL",
  "KCCC_SANDBOX_WEBHOOK_SECRET",
  "KCCC_COMMUNICATIONS_SANDBOX_ALLOWLIST",
  "KCCC_COMMUNICATIONS_PROVIDER_KEY",
] as const;

export function inspectCredentialVault(
  env: NodeJS.ProcessEnv = process.env,
): CredentialCheck[] {
  return PROVIDER_CREDENTIAL_ENV_KEYS.map((envKey) => {
    if (envKey === "KCCC_RESEND_FROM_EMAIL") {
      const v = env[envKey]?.trim();
      if (!v) {
        return {
          envKey,
          status: "MISSING" as const,
          operatorWarning: "Sender identity not set (sandbox may use default).",
        };
      }
      if (!v.includes("@")) {
        return {
          envKey,
          status: "MALFORMED" as const,
          operatorWarning: "Sender email appears malformed.",
        };
      }
      return {
        envKey,
        status: "PRESENT" as const,
        operatorWarning: null,
      };
    }
    if (envKey === "KCCC_COMMUNICATIONS_SANDBOX_ALLOWLIST") {
      const v = env[envKey]?.trim();
      if (!v) {
        return {
          envKey,
          status: "MISSING" as const,
          operatorWarning:
            "Sandbox allowlist empty — Resend live sandbox sends blocked.",
        };
      }
      return {
        envKey,
        status: "PRESENT" as const,
        operatorWarning: null,
      };
    }
    if (envKey === "KCCC_COMMUNICATIONS_PROVIDER_KEY") {
      const v = env[envKey]?.trim();
      if (!v || v === "disabled") {
        return {
          envKey,
          status: "MISSING" as const,
          operatorWarning: "No production provider selected (expected for D22).",
        };
      }
      return {
        envKey,
        status: "PRESENT" as const,
        operatorWarning:
          v === "resend"
            ? "Provider key set — production gates still apply."
            : `Provider key=${v}`,
      };
    }
    return credentialPresent(envKey, env[envKey]);
  });
}

export function credentialVaultOperatorSummary(
  checks: CredentialCheck[] = inspectCredentialVault(),
): {
  missing: string[];
  malformed: string[];
  warnings: string[];
} {
  return {
    missing: checks.filter((c) => c.status === "MISSING").map((c) => c.envKey),
    malformed: checks
      .filter((c) => c.status === "MALFORMED")
      .map((c) => c.envKey),
    warnings: checks
      .map((c) => c.operatorWarning)
      .filter((w): w is string => Boolean(w)),
  };
}
