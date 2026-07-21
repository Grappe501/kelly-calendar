import type {
  DispatchPreflightInput,
  DispatchPreflightResult,
} from "@/lib/missions/v21/communications/dispatch/types";

/**
 * Deterministic dispatch preflight from stored/recomputed facts.
 * Never trusts client-provided fingerprints as truth — caller must supply recomputed values.
 */
export function evaluateDispatchPreflight(
  input: DispatchPreflightInput,
): DispatchPreflightResult {
  const blocking: string[] = [];
  const warnings: string[] = [];

  if (!input.communicationActive) blocking.push("COMMUNICATION_INACTIVE");
  if (input.communicationCancelled) blocking.push("COMMUNICATION_CANCELLED");
  if (!input.queuePrepared) blocking.push("QUEUE_NOT_PREPARED");
  if (input.alreadyDispatched) blocking.push("ALREADY_DISPATCHED");
  if (!input.hasValidContentApproval) blocking.push("CONTENT_APPROVAL_INVALID");
  if (!input.hasValidAudienceApproval) blocking.push("AUDIENCE_APPROVAL_INVALID");
  if (!input.hasValidDispatchApproval) blocking.push("DISPATCH_APPROVAL_INVALID");
  if (!input.policyExternalDispatchEnabled) {
    blocking.push("POLICY_EXTERNAL_DISPATCH_DISABLED");
  }
  if (input.providerMode === "DISABLED") blocking.push("PROVIDER_MODE_DISABLED");
  if (!input.providerDispatchEnabled) {
    blocking.push("PROVIDER_DISPATCH_DISABLED");
  }
  if (input.globalKillSwitch) blocking.push("GLOBAL_KILL_SWITCH");
  if (input.channel === "EMAIL" && input.emailKillSwitch) {
    blocking.push("EMAIL_KILL_SWITCH");
  }
  if (input.channel === "SMS" && input.smsKillSwitch) {
    blocking.push("SMS_KILL_SWITCH");
  }
  if (!input.contactActive) blocking.push("CONTACT_INACTIVE");
  if (!input.contactVerified) blocking.push("CONTACT_UNVERIFIED");
  if (!input.consentEffective) blocking.push("CONSENT_INEFFECTIVE");
  if (input.suppressionApplies) blocking.push("SUPPRESSION_ACTIVE");
  if (input.destinationChanged) blocking.push("DESTINATION_CHANGED");
  if (input.unknownOutcomeOpen) blocking.push("UNKNOWN_OUTCOME_OPEN");
  if (input.rateLimitExceeded) blocking.push("RATE_LIMIT_EXCEEDED");
  if (!input.destinationRef) blocking.push("MISSING_DESTINATION_REF");
  if (!input.contentFingerprint) blocking.push("MISSING_CONTENT_FINGERPRINT");
  if (!input.audienceFingerprint) blocking.push("MISSING_AUDIENCE_FINGERPRINT");
  if (input.mobilizeLinkValid === false) {
    blocking.push("MOBILIZE_LINK_INVALID");
  }
  if (input.providerMode === "PRODUCTION") {
    warnings.push("PRODUCTION_MODE_REQUIRES_EXPLICIT_AUTHORIZATION");
  }

  return {
    ok: blocking.length === 0,
    blockingReasonCodes: blocking,
    warningReasonCodes: warnings,
  };
}

export function dispatchIdempotencyKey(input: {
  queueItemId: string;
  contentFingerprint: string;
  audienceFingerprint: string;
  providerKey: string;
}): string {
  return `dispatch:${input.providerKey}:${input.queueItemId}:${input.contentFingerprint}:${input.audienceFingerprint}`;
}
