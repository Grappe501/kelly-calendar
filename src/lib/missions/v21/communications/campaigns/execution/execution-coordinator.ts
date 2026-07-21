import { evaluateDispatchPreflight } from "@/lib/missions/v21/communications/dispatch";
import type { DispatchPreflightInput } from "@/lib/missions/v21/communications/dispatch/types";
import { d25ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/campaigns/campaign-policy";
import { canCreateNewBatches, canDispatchBatch } from "@/lib/missions/v21/communications/campaigns/state/campaign-state-machine";
import { isWithinAuthorizedWindow } from "@/lib/missions/v21/communications/campaigns/planning/schedule-validator";
import { assertBatchWithinLimits } from "@/lib/missions/v21/communications/campaigns/planning/rate-policy";
import type { RatePolicy } from "@/lib/missions/v21/communications/campaigns/campaign-types";

export type CampaignExecutionGateInput = {
  runStatus: string;
  batchStatus?: string;
  campaignCancelled: boolean;
  campaignPaused: boolean;
  authorizationRevoked: boolean;
  authorizationExpired: boolean;
  authorizedStartAt: Date | string | null;
  authorizedEndAt: Date | string | null;
  executionMode: string;
  providerMode: string;
  sandboxAllowlisted: boolean;
  killSwitchBlocks: boolean;
};

export function assertCampaignExecutionGate(
  input: CampaignExecutionGateInput,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.campaignCancelled) reasons.push("CAMPAIGN_CANCELLED");
  if (input.campaignPaused) reasons.push("CAMPAIGN_PAUSED");
  if (input.authorizationRevoked) reasons.push("AUTHORIZATION_REVOKED");
  if (input.authorizationExpired) reasons.push("AUTHORIZATION_EXPIRED");
  if (
    !isWithinAuthorizedWindow({
      authorizedStartAt: input.authorizedStartAt,
      authorizedEndAt: input.authorizedEndAt,
    })
  ) {
    reasons.push("OUTSIDE_AUTHORIZED_WINDOW");
  }
  if (
    input.executionMode !== "MANUAL_SANDBOX" &&
    input.executionMode !== "SCHEDULED_SANDBOX"
  ) {
    reasons.push("PRODUCTION_MODE_NOT_AUTHORIZED");
  }
  if (input.providerMode === "PRODUCTION") {
    reasons.push("PRODUCTION_PROVIDER_NOT_ENABLED");
  }
  if (!input.sandboxAllowlisted) {
    reasons.push("RECIPIENT_NOT_SANDBOX_ALLOWLISTED");
  }
  if (input.killSwitchBlocks) reasons.push("KILL_SWITCH_ACTIVE");
  if (!canCreateNewBatches(input.runStatus) && !input.batchStatus) {
    reasons.push("RUN_NOT_ACTIVE_FOR_BATCHES");
  }
  if (
    input.batchStatus &&
    !canDispatchBatch(input.runStatus, input.batchStatus)
  ) {
    reasons.push("BATCH_NOT_DISPATCHABLE");
  }
  reasons.push(d25ProductionDispatchHardBlock().reason.includes("DISPATCH")
    ? "PRODUCTION_DISPATCH_BLOCKED"
    : "PRODUCTION_DISPATCH_BLOCKED");
  // Gate never opens production — ok only for sandbox planning checks when
  // the only hard block is PRODUCTION_DISPATCH_BLOCKED.
  const nonProd = reasons.filter((r) => r !== "PRODUCTION_DISPATCH_BLOCKED");
  return { ok: nonProd.length === 0, reasons: [...new Set(reasons)] };
}

export function runCampaignAttemptPreflight(
  base: DispatchPreflightInput,
  campaign: {
    campaignId: string;
    campaignRevisionApproved: boolean;
    launchAuthorizationValid: boolean;
    executionRunActive: boolean;
    executionBatchActive: boolean;
    insideAuthorizedWindow: boolean;
    campaignPaused: boolean;
    campaignCancelled: boolean;
    sandboxAllowlisted: boolean;
  },
) {
  const result = evaluateDispatchPreflight({
    ...base,
    // D25 fields
    campaignId: campaign.campaignId,
    campaignRevisionApproved: campaign.campaignRevisionApproved,
    launchAuthorizationValid: campaign.launchAuthorizationValid,
    executionRunActive: campaign.executionRunActive,
    executionBatchActive: campaign.executionBatchActive,
    insideAuthorizedWindow: campaign.insideAuthorizedWindow,
    campaignPaused: campaign.campaignPaused,
    campaignCancelled: campaign.campaignCancelled,
    sandboxAllowlisted: campaign.sandboxAllowlisted,
  });
  return result;
}

export function prepareBatchGate(input: {
  runStatus: string;
  policy: RatePolicy;
  authorizationRecipientLimit: number;
  authorizationBatchLimit: number;
  plannedCount: number;
  attemptsAlreadyCreated: number;
  attemptsInLastHour: number;
  secondsSinceLastBatch: number | null;
  executionGate: CampaignExecutionGateInput;
}): { ok: boolean; reasons: string[] } {
  const exec = assertCampaignExecutionGate(input.executionGate);
  const limits = assertBatchWithinLimits({
    policy: input.policy,
    authorizationRecipientLimit: input.authorizationRecipientLimit,
    authorizationBatchLimit: input.authorizationBatchLimit,
    plannedCount: input.plannedCount,
    attemptsAlreadyCreated: input.attemptsAlreadyCreated,
    attemptsInLastHour: input.attemptsInLastHour,
    secondsSinceLastBatch: input.secondsSinceLastBatch,
  });
  const reasons = [...exec.reasons, ...limits.reasons];
  const nonProd = reasons.filter((r) => r !== "PRODUCTION_DISPATCH_BLOCKED");
  return { ok: nonProd.length === 0 && limits.ok, reasons: [...new Set(reasons)] };
}
