/**
 * LG-1 Phase B — provider readiness classification (no secrets).
 * Separates technical LIVE_TEST_READY eligibility from live transport.
 */
import {
  assertProviderStateForLiveTest,
  d26ProductionDispatchHardBlock,
} from "@/lib/missions/v21/communications/live-tests/live-test-policy";
import type { LiveTestProviderState } from "@/lib/missions/v21/communications/live-tests/live-test-types";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";
import { d25ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/campaigns";
import { defaultProductionSafetyGates } from "@/lib/missions/v21/communications/providers/base/production-gates";

export type CredentialAvailability =
  | "NOT_CONFIGURED"
  | "CONFIGURED_UNVERIFIED"
  | "AUTHENTICATED"
  | "INVALID"
  | "INSUFFICIENT_SCOPE"
  | "REVOKED"
  | "UNKNOWN";

export type CapabilityResult =
  | "SUPPORTED"
  | "SUPPORTED_WITH_LIMITATION"
  | "NOT_SUPPORTED"
  | "UNKNOWN"
  | "NOT_APPLICABLE";

export const LG1_PHASE_B_BUILD =
  "KCCC-V2.1-LG-1-PHASE-B-PROVIDER-READINESS-1.0";

export const RESEND_CREDENTIAL_ENV_NAMES = [
  "KCCC_RESEND_API_KEY",
  "KCCC_RESEND_WEBHOOK_SECRET",
  "KCCC_RESEND_FROM_EMAIL",
] as const;

export function classifyResendCredentialPresence(env: {
  apiKeyPresent: boolean;
  webhookSecretPresent: boolean;
  fromEmailPresent: boolean;
}): CredentialAvailability {
  if (!env.apiKeyPresent) return "NOT_CONFIGURED";
  if (!env.webhookSecretPresent || !env.fromEmailPresent) {
    return "CONFIGURED_UNVERIFIED";
  }
  return "CONFIGURED_UNVERIFIED";
}

export function classifyAuthenticationOutcome(input: {
  credentialAvailability: CredentialAvailability;
  apiReachability:
    | "NOT_APPLICABLE"
    | "REACHABLE"
    | "NETWORK_ERROR"
    | `HTTP_${number}`;
  authenticationClass:
    | "NOT_CONFIGURED"
    | "AUTHENTICATED"
    | "AUTH_FAILED"
    | "UNEXPECTED_STATUS"
    | "NETWORK_ERROR"
    | "UNKNOWN";
}): CredentialAvailability {
  if (input.credentialAvailability === "NOT_CONFIGURED") {
    return "NOT_CONFIGURED";
  }
  if (input.authenticationClass === "AUTHENTICATED") return "AUTHENTICATED";
  if (input.authenticationClass === "AUTH_FAILED") return "INVALID";
  if (input.authenticationClass === "NETWORK_ERROR") return "UNKNOWN";
  if (input.authenticationClass === "UNEXPECTED_STATUS") return "UNKNOWN";
  return "CONFIGURED_UNVERIFIED";
}

/** Resend official adapter capability matrix for LG-1 email (code-level). */
export function resendLg1CapabilityMatrix(): Record<
  string,
  { result: CapabilityResult; blocking: boolean; note: string }
> {
  return {
    productionEndpoint: {
      result: "SUPPORTED",
      blocking: false,
      note: "api.resend.com via server fetch",
    },
    emailSend: {
      result: "SUPPORTED",
      blocking: false,
      note: "EMAIL channel; production send refused by adapter gates",
    },
    senderVerification: {
      result: "SUPPORTED_WITH_LIMITATION",
      blocking: false,
      note: "Surfaced via KCCC_RESEND_FROM_EMAIL + Phase C verification",
    },
    domainVerification: {
      result: "SUPPORTED_WITH_LIMITATION",
      blocking: false,
      note: "Adapter domainVerification=true; Phase C DNS evidence required",
    },
    idempotency: {
      result: "SUPPORTED",
      blocking: false,
      note: "idempotencyKey on send input; D26 one-request limit",
    },
    providerMessageReference: {
      result: "SUPPORTED",
      blocking: false,
      note: "providerMessageId on accept path",
    },
    signedWebhooks: {
      result: "SUPPORTED",
      blocking: false,
      note: "KCCC_RESEND_WEBHOOK_SECRET + signature verify path",
    },
    deliveryEvents: {
      result: "SUPPORTED",
      blocking: false,
      note: "Normalized delivery events via webhook",
    },
    bounceEvents: {
      result: "SUPPORTED",
      blocking: false,
      note: "Bounce normalization supported in adapter path",
    },
    complaintEvents: {
      result: "SUPPORTED_WITH_LIMITATION",
      blocking: false,
      note: "Where Resend emits complaint/abuse events",
    },
    suppressionEvents: {
      result: "SUPPORTED",
      blocking: false,
      note: "Maps into D20 canonical suppression; does not replace D20",
    },
    rateLimitVisibility: {
      result: "SUPPORTED_WITH_LIMITATION",
      blocking: false,
      note: "Capability matrix rateLimits=true; dashboard may supplement API",
    },
  };
}

export function evaluatePhaseBProviderReadiness(input: {
  adapterKey: string;
  channel: "EMAIL" | "SMS";
  credentialAvailability: CredentialAvailability;
  criticalCapabilitiesOk: boolean;
  signedWebhookPathExists: boolean;
  providerMessageReferenceSupported: boolean;
  duplicateProtectionSupported: boolean;
}): {
  status: "PASSED" | "PASSED_WITH_WARNINGS" | "BLOCKED";
  mayMarkLiveTestReady: boolean;
  blockingIssues: string[];
  warnings: string[];
} {
  const blocking: string[] = [];
  const warnings: string[] = [];

  if (input.adapterKey !== "resend") {
    // Allow other official adapters only when explicitly selected and wired
    if (input.adapterKey === "kccc-sandbox") {
      blocking.push("SANDBOX_HARNESS_NOT_ELIGIBLE_FOR_LIVE_TEST");
    }
  }
  if (input.channel !== "EMAIL") {
    blocking.push("LG1_EMAIL_CHANNEL_REQUIRED");
  }
  if (input.credentialAvailability === "NOT_CONFIGURED") {
    blocking.push("CREDENTIALS_NOT_CONFIGURED");
  }
  if (input.credentialAvailability === "INVALID") {
    blocking.push("CREDENTIALS_INVALID");
  }
  if (input.credentialAvailability === "INSUFFICIENT_SCOPE") {
    blocking.push("CREDENTIAL_SCOPE_INSUFFICIENT");
  }
  if (input.credentialAvailability === "UNKNOWN") {
    blocking.push("AUTHENTICATION_OUTCOME_UNKNOWN");
  }
  if (input.credentialAvailability === "CONFIGURED_UNVERIFIED") {
    blocking.push("CREDENTIALS_CONFIGURED_BUT_UNVERIFIED");
  }
  if (!input.criticalCapabilitiesOk) {
    blocking.push("CRITICAL_CAPABILITY_MISSING");
  }
  if (!input.signedWebhookPathExists) {
    blocking.push("SIGNED_WEBHOOK_PATH_MISSING");
  }
  if (!input.providerMessageReferenceSupported) {
    blocking.push("PROVIDER_MESSAGE_REFERENCE_MISSING");
  }
  if (!input.duplicateProtectionSupported) {
    blocking.push("DUPLICATE_PROTECTION_MISSING");
  }

  // Transport remains blocked even when LIVE_TEST_READY is allowed later
  warnings.push("LIVE_TRANSPORT_REMAINS_BLOCKED_BY_KILL_SWITCHES");
  warnings.push("GENERAL_PRODUCTION_REMAINS_BLOCKED");

  const mayMarkLiveTestReady =
    input.credentialAvailability === "AUTHENTICATED" &&
    input.criticalCapabilitiesOk &&
    input.signedWebhookPathExists &&
    input.providerMessageReferenceSupported &&
    input.duplicateProtectionSupported &&
    input.channel === "EMAIL" &&
    input.adapterKey === "resend";

  return {
    status: mayMarkLiveTestReady
      ? "PASSED"
      : blocking.length > 0
        ? "BLOCKED"
        : "PASSED_WITH_WARNINGS",
    mayMarkLiveTestReady,
    blockingIssues: [...new Set(blocking)],
    warnings: [...new Set(warnings)],
  };
}

/**
 * LIVE_TEST_READY must never imply transport or general production.
 */
export function assertLiveTestReadyDoesNotEnableTransport(input: {
  providerState: LiveTestProviderState;
  globalKillSwitch: boolean;
  channelKillSwitch: boolean;
  providerKillSwitch: boolean;
  productionDispatchFlag: boolean;
}): {
  transportBlocked: boolean;
  generalProductionBlocked: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const stateOk = assertProviderStateForLiveTest(input.providerState);
  if (input.providerState === "LIVE_TEST_READY" && !stateOk.ok) {
    reasons.push(...stateOk.reasons);
  }
  if (input.globalKillSwitch) reasons.push("GLOBAL_KILL_SWITCH_ACTIVE");
  if (input.channelKillSwitch) reasons.push("CHANNEL_KILL_SWITCH_ACTIVE");
  if (input.providerKillSwitch) reasons.push("PROVIDER_KILL_SWITCH_ACTIVE");
  if (!input.productionDispatchFlag) {
    reasons.push("PRODUCTION_DISPATCH_FLAG_FALSE");
  } else {
    reasons.push("PRODUCTION_DISPATCH_FLAG_UNEXPECTEDLY_TRUE");
  }
  reasons.push(d22ProductionDispatchHardBlock().reason);
  reasons.push(d25ProductionDispatchHardBlock().reason);
  reasons.push(d26ProductionDispatchHardBlock().reason);

  const gates = defaultProductionSafetyGates();
  const transportBlocked =
    input.globalKillSwitch ||
    input.channelKillSwitch ||
    input.providerKillSwitch ||
    !gates.killSwitchOff ||
    d22ProductionDispatchHardBlock().blocked;

  return {
    transportBlocked,
    generalProductionBlocked:
      !input.productionDispatchFlag && d22ProductionDispatchHardBlock().blocked,
    reasons: [...new Set(reasons)],
  };
}

export function lg1EffectiveProviderRequestLimit(): {
  maximumProviderRequests: 1;
  source: string;
} {
  return {
    maximumProviderRequests: 1,
    source: "D26 one-time authorization shipped default",
  };
}
