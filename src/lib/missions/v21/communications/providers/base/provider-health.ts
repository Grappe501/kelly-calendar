import type {
  CredentialCheck,
  ProviderHealthReport,
  ProviderLifecycleStatus,
} from "@/lib/missions/v21/communications/providers/base/provider-types";

export function emptyHealth(
  providerKey: string,
  status: ProviderLifecycleStatus,
  notes: string[] = [],
): ProviderHealthReport {
  return {
    providerKey,
    currentStatus: status,
    apiReachability: "UNKNOWN",
    authentication: "NOT_APPLICABLE",
    domainVerified: false,
    senderVerified: false,
    webhookVerified: false,
    sandboxWorking: false,
    productionEnabled: false,
    averageLatencyMs: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    rateLimits: null,
    webhookDelayMs: null,
    clockDriftSeconds: null,
    credentialAgeDays: null,
    certificateExpirationAt: null,
    suppressionSyncAgeMinutes: null,
    notes: [
      "Production enabled remains false in D22.",
      ...notes,
    ],
  };
}

export function credentialPresent(
  envKey: string,
  value: string | undefined,
): CredentialCheck {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return {
      envKey,
      status: "MISSING",
      operatorWarning: `${envKey} is not set. Secrets must live in environment variables only.`,
    };
  }
  if (trimmed.length < 8) {
    return {
      envKey,
      status: "MALFORMED",
      operatorWarning: `${envKey} appears malformed (too short).`,
    };
  }
  if (/^(test|todo|changeme|xxx)/i.test(trimmed)) {
    return {
      envKey,
      status: "MALFORMED",
      operatorWarning: `${envKey} looks like a placeholder — rotate to a real secret.`,
    };
  }
  return {
    envKey,
    status: "PRESENT",
    operatorWarning: null,
  };
}

export function redactSecretPresence(value: string | undefined): "set" | "unset" {
  return value?.trim() ? "set" : "unset";
}
