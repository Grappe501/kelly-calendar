import type { CommExecutionMode } from "@/lib/missions/v21/communications/campaigns/campaign-types";
import {
  D25_BLOCKED_EXECUTION_MODES,
  D25_ENABLED_EXECUTION_MODES,
} from "@/lib/missions/v21/communications/campaigns/campaign-types";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";

export function isExecutionModeEnabled(mode: CommExecutionMode): boolean {
  return (D25_ENABLED_EXECUTION_MODES as readonly string[]).includes(mode);
}

export function assertSandboxExecutionMode(mode: CommExecutionMode): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if ((D25_BLOCKED_EXECUTION_MODES as readonly string[]).includes(mode)) {
    if (mode === "PRODUCTION") reasons.push("PRODUCTION_MODE_NOT_AUTHORIZED");
    if (mode === "CONTROLLED_LIVE_TEST") {
      reasons.push("CONTROLLED_LIVE_TEST_NOT_AVAILABLE");
    }
  }
  if (!isExecutionModeEnabled(mode)) {
    reasons.push("EXECUTION_MODE_NOT_ENABLED");
  }
  // Always surface hard production block
  reasons.push("PRODUCTION_DISPATCH_BLOCKED");
  const hard = d22ProductionDispatchHardBlock();
  if (hard.blocked && mode === "PRODUCTION") {
    reasons.push("PRODUCTION_KILL_SWITCH_ACTIVE");
    reasons.push("PRODUCTION_PROVIDER_NOT_ENABLED");
  }
  return { ok: false, reasons: [...new Set(reasons)] };
}

export function d25ProductionDispatchHardBlock(): {
  blocked: true;
  reason: string;
} {
  return {
    blocked: true,
    reason:
      "DISPATCH BLOCKED — D25 campaign execution permits MANUAL_SANDBOX / SCHEDULED_SANDBOX only. Production and controlled live-test remain unavailable.",
  };
}

export const DEFAULT_SANDBOX_RATE_POLICY = {
  maximumRecipients: 25,
  maximumBatchSize: 5,
  maximumAttemptsPerRun: 25,
  maximumAttemptsPerHour: 25,
  minimumDelayBetweenBatchesSeconds: 30,
} as const;
