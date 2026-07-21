import { evaluateDispatchPreflight } from "@/lib/missions/v21/communications/dispatch";
import type { DispatchPreflightInput } from "@/lib/missions/v21/communications/dispatch/types";
import {
  assertShippedLiveTestLimits,
  d26ProductionDispatchHardBlock,
} from "@/lib/missions/v21/communications/live-tests/live-test-policy";
import { matchesLaunchPhrase } from "@/lib/missions/v21/communications/live-tests/revisions/live-test-revision-fingerprint";
import { postTestSafetyEvidenceHash } from "@/lib/missions/v21/communications/live-tests/revisions/live-test-revision-fingerprint";

export type AtomicLaunchInput = {
  typedConfirmation: string;
  authorizationStatus: string;
  authorizationHash: string;
  expectedAuthorizationHash: string;
  authorizationExpired: boolean;
  authorizationRevoked: boolean;
  alreadyConsumed: boolean;
  readinessStatus: string;
  emergencyStopActive: boolean;
  scheduledInvocation: boolean;
  audienceManifestUsed: boolean;
  maximumRecipients: number;
  maximumAttempts: number;
  maximumProviderRequests: number;
  manualLaunchOnly: boolean;
  retriesAllowed: boolean;
  providerState: string;
  preflightBase: DispatchPreflightInput;
};

export type AtomicLaunchResult = {
  maySubmitProvider: boolean;
  consumeAuthorization: boolean;
  status:
    | "PREFLIGHT_BLOCKED"
    | "READY_TO_SUBMIT"
    | "BLOCKED"
    | "CONSUME_ON_UNCERTAIN";
  reasons: string[];
  preflightBlocking: string[];
};

/**
 * Canonical D26 launch gate. Preflight failure does not consume.
 * Provider submission path (including uncertain outcomes) consumes.
 */
export function evaluateAtomicLiveTestLaunch(
  input: AtomicLaunchInput,
): AtomicLaunchResult {
  const reasons: string[] = [];

  if (input.scheduledInvocation) {
    reasons.push("SCHEDULED_LIVE_LAUNCH_PROHIBITED");
  }
  if (input.audienceManifestUsed) {
    reasons.push("AUDIENCE_MANIFEST_LIVE_LAUNCH_PROHIBITED");
  }
  if (!matchesLaunchPhrase(input.typedConfirmation)) {
    reasons.push("LAUNCH_CONFIRMATION_PHRASE_MISMATCH");
  }
  if (input.authorizationStatus !== "AUTHORIZED") {
    reasons.push("AUTHORIZATION_NOT_ACTIVE");
  }
  if (input.authorizationHash !== input.expectedAuthorizationHash) {
    reasons.push("AUTHORIZATION_HASH_MISMATCH");
  }
  if (input.authorizationExpired) reasons.push("AUTHORIZATION_EXPIRED");
  if (input.authorizationRevoked) reasons.push("AUTHORIZATION_REVOKED");
  if (input.alreadyConsumed) reasons.push("AUTHORIZATION_ALREADY_CONSUMED");
  if (input.readinessStatus !== "READY" && input.readinessStatus !== "APPROVED") {
    reasons.push("READINESS_NOT_READY");
  }
  if (input.emergencyStopActive) reasons.push("EMERGENCY_STOP_ACTIVE");
  if (input.providerState !== "LIVE_TEST_READY") {
    reasons.push("PROVIDER_NOT_LIVE_TEST_READY");
  }

  const limits = assertShippedLiveTestLimits({
    maximumRecipients: input.maximumRecipients,
    maximumAttempts: input.maximumAttempts,
    maximumProviderRequests: input.maximumProviderRequests,
    manualLaunchOnly: input.manualLaunchOnly,
    retriesAllowed: input.retriesAllowed,
  });
  if (!limits.ok) reasons.push(...limits.reasons);

  const preflight = evaluateDispatchPreflight(input.preflightBase);
  if (!preflight.ok) {
    return {
      maySubmitProvider: false,
      consumeAuthorization: false,
      status: "PREFLIGHT_BLOCKED",
      reasons: [...new Set([...reasons, ...preflight.blockingReasonCodes])],
      preflightBlocking: preflight.blockingReasonCodes,
    };
  }

  if (reasons.length > 0) {
    return {
      maySubmitProvider: false,
      consumeAuthorization: false,
      status: "BLOCKED",
      reasons: [...new Set(reasons)],
      preflightBlocking: [],
    };
  }

  return {
    maySubmitProvider: true,
    consumeAuthorization: true,
    status: "READY_TO_SUBMIT",
    reasons: [d26ProductionDispatchHardBlock().reason],
    preflightBlocking: [],
  };
}

export function verifyPostTestProductionBlock(input: {
  authorizationConsumed: boolean;
  productionDispatchFlag: boolean;
  productionCampaignModeEnabled: boolean;
  scheduledIngressEnabled: boolean;
  audienceLiveDispatchEnabled: boolean;
  killSwitchesActive: boolean;
  generalProductionPermissionExists: boolean;
}): {
  ok: boolean;
  failedClosed: boolean;
  snapshot: Record<string, unknown>;
  evidenceHash: string;
  incidentTypes: string[];
} {
  const snapshot = {
    productionDispatchFlagBlocked: !input.productionDispatchFlag,
    productionCampaignModeBlocked: !input.productionCampaignModeEnabled,
    authorizationConsumed: input.authorizationConsumed,
    scheduledIngressBlocked: !input.scheduledIngressEnabled,
    audienceDispatchBlocked: !input.audienceLiveDispatchEnabled,
    killSwitchesActive: input.killSwitchesActive,
    generalProductionPermissionExists: input.generalProductionPermissionExists,
    d26: d26ProductionDispatchHardBlock().reason,
  };
  const incidentTypes: string[] = [];
  if (input.productionDispatchFlag) incidentTypes.push("PRODUCTION_BLOCK_FAILURE");
  if (input.productionCampaignModeEnabled) {
    incidentTypes.push("PRODUCTION_BLOCK_FAILURE");
  }
  if (!input.authorizationConsumed) {
    incidentTypes.push("UNEXPECTED_PROVIDER_SUBMISSION");
  }
  if (input.scheduledIngressEnabled) incidentTypes.push("PRODUCTION_BLOCK_FAILURE");
  if (input.audienceLiveDispatchEnabled) {
    incidentTypes.push("PRODUCTION_BLOCK_FAILURE");
  }
  if (!input.killSwitchesActive) incidentTypes.push("PRODUCTION_BLOCK_FAILURE");
  if (input.generalProductionPermissionExists) {
    incidentTypes.push("PRODUCTION_BLOCK_FAILURE");
  }
  const ok = incidentTypes.length === 0;
  return {
    ok,
    failedClosed: !ok,
    snapshot,
    evidenceHash: postTestSafetyEvidenceHash(snapshot),
    incidentTypes: [...new Set(incidentTypes)],
  };
}

/** Unknown provider outcomes must fail closed — no retry on same authorization. */
export function classifyProviderOutcome(outcome: {
  submitted: boolean;
  accepted: boolean;
  rejected: boolean;
  timeout: boolean;
  unknown: boolean;
}): {
  executionStatus: string;
  consumeAuthorization: boolean;
  allowRetry: false;
  incidentType: string | null;
} {
  if (outcome.timeout || outcome.unknown) {
    return {
      executionStatus: "UNKNOWN",
      consumeAuthorization: true,
      allowRetry: false,
      incidentType: "UNKNOWN_PROVIDER_OUTCOME",
    };
  }
  if (outcome.accepted) {
    return {
      executionStatus: "ACCEPTED",
      consumeAuthorization: true,
      allowRetry: false,
      incidentType: null,
    };
  }
  if (outcome.rejected) {
    return {
      executionStatus: "FAILED",
      consumeAuthorization: true,
      allowRetry: false,
      incidentType: null,
    };
  }
  if (outcome.submitted) {
    return {
      executionStatus: "SUBMITTED",
      consumeAuthorization: true,
      allowRetry: false,
      incidentType: null,
    };
  }
  return {
    executionStatus: "CANCELLED_BEFORE_SUBMISSION",
    consumeAuthorization: false,
    allowRetry: false,
    incidentType: null,
  };
}
