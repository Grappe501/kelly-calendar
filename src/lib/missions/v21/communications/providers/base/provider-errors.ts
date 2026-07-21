/**
 * Canonical provider errors — never leak secrets or raw vendor payloads.
 */

export type ProviderErrorCategory =
  | "NOT_INITIALIZED"
  | "NOT_CONFIGURED"
  | "AUTHENTICATION_FAILED"
  | "SENDER_UNVERIFIED"
  | "DOMAIN_UNVERIFIED"
  | "SANDBOX_ONLY"
  | "PRODUCTION_BLOCKED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK_FAILURE"
  | "MALFORMED_PAYLOAD"
  | "DUPLICATE"
  | "CLOCK_SKEW"
  | "WEBHOOK_INVALID"
  | "PROVIDER_UNAVAILABLE"
  | "CREDENTIAL_REVOKED"
  | "UNSUPPORTED"
  | "CANCELLED"
  | "INTERNAL";

export class ProviderError extends Error {
  readonly category: ProviderErrorCategory;
  readonly retryable: boolean;
  readonly recoveryGuidance: string;

  constructor(input: {
    category: ProviderErrorCategory;
    message: string;
    retryable?: boolean;
    recoveryGuidance?: string;
  }) {
    super(input.message);
    this.name = "ProviderError";
    this.category = input.category;
    this.retryable = input.retryable ?? false;
    this.recoveryGuidance =
      input.recoveryGuidance ??
      defaultRecoveryGuidance(input.category);
  }
}

export function defaultRecoveryGuidance(
  category: ProviderErrorCategory,
): string {
  switch (category) {
    case "NOT_CONFIGURED":
      return "Install credentials via environment variables, then re-run verify().";
    case "AUTHENTICATION_FAILED":
      return "Rotate API credentials in the env vault; never store secrets in the database.";
    case "CREDENTIAL_REVOKED":
      return "Issue new credentials with the vendor and update env vars; mark old keys revoked.";
    case "RATE_LIMITED":
      return "Back off and respect provider rate limits; do not widen production volume.";
    case "TIMEOUT":
    case "NETWORK_FAILURE":
    case "PROVIDER_UNAVAILABLE":
      return "Retry with bounded backoff; keep kill switches ON until health recovers.";
    case "WEBHOOK_INVALID":
    case "CLOCK_SKEW":
      return "Validate signature secret, clock sync, and replay fingerprint rules.";
    case "PRODUCTION_BLOCKED":
    case "SANDBOX_ONLY":
      return "Production dispatch remains DISPATCH BLOCKED until all D22 safety gates pass.";
    case "DUPLICATE":
      return "Treat as success for idempotent replay; do not re-send.";
    default:
      return "Inspect provider health dashboard and sandbox certification evidence.";
  }
}
