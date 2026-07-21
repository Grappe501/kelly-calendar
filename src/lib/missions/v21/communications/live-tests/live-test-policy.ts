import {
  D26_DEFAULT_LIMITS,
  type LiveTestProviderState,
} from "@/lib/missions/v21/communications/live-tests/live-test-types";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";
import { d25ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/campaigns";

export function d26ProductionDispatchHardBlock(): {
  blocked: true;
  reason: string;
} {
  return {
    blocked: true,
    reason:
      "DISPATCH BLOCKED — D26 authorizes a specific one-time controlled live test, not general production communications capability.",
  };
}

export function isProviderStateLiveTestReady(
  state: LiveTestProviderState,
): boolean {
  return state === "LIVE_TEST_READY";
}

export function assertProviderStateForLiveTest(
  state: LiveTestProviderState,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (state === "DISABLED") reasons.push("PROVIDER_DISABLED");
  if (state === "SANDBOX_ONLY") reasons.push("PROVIDER_SANDBOX_ONLY");
  if (state === "REVOKED") reasons.push("PROVIDER_REVOKED");
  if (state === "PRODUCTION_READY_FUTURE") {
    reasons.push("PRODUCTION_READY_FUTURE_UNUSABLE");
  }
  if (state !== "LIVE_TEST_READY") reasons.push("PROVIDER_NOT_LIVE_TEST_READY");
  reasons.push("GENERAL_PRODUCTION_DISPATCH_BLOCKED");
  return { ok: state === "LIVE_TEST_READY", reasons: [...new Set(reasons)] };
}

export function assertShippedLiveTestLimits(input: {
  maximumRecipients: number;
  maximumAttempts: number;
  maximumProviderRequests: number;
  manualLaunchOnly: boolean;
  retriesAllowed: boolean;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.maximumRecipients !== D26_DEFAULT_LIMITS.maximumRecipients) {
    reasons.push("MAXIMUM_RECIPIENTS_MUST_BE_ONE");
  }
  if (input.maximumAttempts !== D26_DEFAULT_LIMITS.maximumAttempts) {
    reasons.push("MAXIMUM_ATTEMPTS_MUST_BE_ONE");
  }
  if (
    input.maximumProviderRequests !== D26_DEFAULT_LIMITS.maximumProviderRequests
  ) {
    reasons.push("MAXIMUM_PROVIDER_REQUESTS_MUST_BE_ONE");
  }
  if (!input.manualLaunchOnly) reasons.push("MANUAL_LAUNCH_ONLY_REQUIRED");
  if (input.retriesAllowed) reasons.push("RETRIES_MUST_BE_DISABLED");
  return { ok: reasons.length === 0, reasons };
}

export function assertGeneralProductionStillBlocked(): {
  blocked: true;
  layers: string[];
} {
  return {
    blocked: true,
    layers: [
      d22ProductionDispatchHardBlock().reason,
      d25ProductionDispatchHardBlock().reason,
      d26ProductionDispatchHardBlock().reason,
    ],
  };
}
