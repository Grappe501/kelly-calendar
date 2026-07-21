import type { RetryClassification } from "@/lib/missions/v21/communications/campaigns/campaign-types";

const NON_RETRYABLE = new Set([
  "CONSENT_INEFFECTIVE",
  "CONSENT_REVOKED",
  "CONSENT_MISSING",
  "SUPPRESSION_ACTIVE",
  "GLOBAL_SUPPRESSION",
  "CHANNEL_SUPPRESSION",
  "INVALID_DESTINATION",
  "MISSING_DESTINATION",
  "DUPLICATE_DESTINATION",
  "RENDER_ARTIFACT_INVALID",
  "RECIPIENT_MANIFEST_REVOKED",
  "RECIPIENT_MANIFEST_EXPIRED",
  "CAMPAIGN_CANCELLED",
  "AUTHORIZATION_EXPIRED",
  "AUTHORIZATION_REVOKED",
  "PRODUCTION_MODE_NOT_AUTHORIZED",
  "ARBITRARY_DESTINATION_OVERRIDE_REJECTED",
  "PERSONALIZATION_INTEGRITY_MISMATCH",
]);

const RETRYABLE = new Set([
  "PROVIDER_TIMEOUT",
  "PROVIDER_TEMPORARY_REJECTION",
  "RATE_LIMIT_EXCEEDED",
  "TRANSIENT_NETWORK_FAILURE",
]);

export function classifyRetryFailure(
  reasonCodes: string[],
): RetryClassification {
  if (reasonCodes.some((c) => NON_RETRYABLE.has(c))) return "NON_RETRYABLE";
  if (reasonCodes.some((c) => RETRYABLE.has(c))) return "RETRYABLE";
  if (reasonCodes.length === 0) return "UNKNOWN";
  return "REVIEW_REQUIRED";
}

export function defaultRetryPolicy() {
  return {
    maximumRetriesPerAttempt: 1,
    minimumRetryDelaySeconds: 60,
    maximumRetryAgeSeconds: 3600,
    requireOperatorApproval: true,
    allowedFailureClasses: ["RETRYABLE"] as RetryClassification[],
  };
}

export function assertRetryAllowed(input: {
  classification: RetryClassification;
  existingRetryCount: number;
  maximumRetries: number;
  operatorApproved: boolean;
  requireOperatorApproval: boolean;
  windowOpen: boolean;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.classification === "NON_RETRYABLE") {
    reasons.push("NON_RETRYABLE_FAILURE");
  }
  if (input.existingRetryCount >= input.maximumRetries) {
    reasons.push("RETRY_LIMIT_EXCEEDED");
  }
  if (input.requireOperatorApproval && !input.operatorApproved) {
    reasons.push("RETRY_REQUIRES_OPERATOR_APPROVAL");
  }
  if (!input.windowOpen) reasons.push("RETRY_WINDOW_CLOSED");
  if (
    input.classification !== "RETRYABLE" &&
    input.classification !== "REVIEW_REQUIRED"
  ) {
    if (!reasons.includes("NON_RETRYABLE_FAILURE")) {
      reasons.push("RETRY_CLASS_NOT_ALLOWED");
    }
  }
  return { ok: reasons.length === 0, reasons };
}
