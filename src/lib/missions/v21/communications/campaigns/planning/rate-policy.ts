import type { RatePolicy } from "@/lib/missions/v21/communications/campaigns/campaign-types";
import { DEFAULT_SANDBOX_RATE_POLICY } from "@/lib/missions/v21/communications/campaigns/campaign-policy";

export function normalizeRatePolicy(raw?: Partial<RatePolicy> | null): RatePolicy {
  return {
    maximumRecipients: Math.min(
      Math.max(Number(raw?.maximumRecipients) || DEFAULT_SANDBOX_RATE_POLICY.maximumRecipients, 1),
      100,
    ),
    maximumBatchSize: Math.min(
      Math.max(Number(raw?.maximumBatchSize) || DEFAULT_SANDBOX_RATE_POLICY.maximumBatchSize, 1),
      25,
    ),
    maximumAttemptsPerRun: Math.min(
      Math.max(
        Number(raw?.maximumAttemptsPerRun) ||
          DEFAULT_SANDBOX_RATE_POLICY.maximumAttemptsPerRun,
        1,
      ),
      100,
    ),
    maximumAttemptsPerHour: Math.min(
      Math.max(
        Number(raw?.maximumAttemptsPerHour) ||
          DEFAULT_SANDBOX_RATE_POLICY.maximumAttemptsPerHour,
        1,
      ),
      100,
    ),
    minimumDelayBetweenBatchesSeconds: Math.max(
      Number(raw?.minimumDelayBetweenBatchesSeconds) ||
        DEFAULT_SANDBOX_RATE_POLICY.minimumDelayBetweenBatchesSeconds,
      0,
    ),
  };
}

export function assertBatchWithinLimits(input: {
  policy: RatePolicy;
  authorizationRecipientLimit: number;
  authorizationBatchLimit: number;
  plannedCount: number;
  attemptsAlreadyCreated: number;
  attemptsInLastHour: number;
  secondsSinceLastBatch: number | null;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.plannedCount <= 0) reasons.push("EMPTY_BATCH");
  if (input.plannedCount > input.policy.maximumBatchSize) {
    reasons.push("BATCH_SIZE_EXCEEDED");
  }
  if (input.plannedCount > input.authorizationBatchLimit) {
    reasons.push("AUTHORIZATION_BATCH_LIMIT_EXCEEDED");
  }
  if (
    input.attemptsAlreadyCreated + input.plannedCount >
    input.policy.maximumAttemptsPerRun
  ) {
    reasons.push("RUN_ATTEMPT_LIMIT_EXCEEDED");
  }
  if (
    input.attemptsAlreadyCreated + input.plannedCount >
    input.authorizationRecipientLimit
  ) {
    reasons.push("AUTHORIZATION_RECIPIENT_LIMIT_EXCEEDED");
  }
  if (
    input.attemptsAlreadyCreated + input.plannedCount >
    input.policy.maximumRecipients
  ) {
    reasons.push("CAMPAIGN_RECIPIENT_LIMIT_EXCEEDED");
  }
  if (
    input.attemptsInLastHour + input.plannedCount >
    input.policy.maximumAttemptsPerHour
  ) {
    reasons.push("HOURLY_ATTEMPT_LIMIT_EXCEEDED");
  }
  if (
    input.secondsSinceLastBatch != null &&
    input.secondsSinceLastBatch < input.policy.minimumDelayBetweenBatchesSeconds
  ) {
    reasons.push("MINIMUM_BATCH_DELAY_NOT_MET");
  }
  return { ok: reasons.length === 0, reasons };
}

/** Deterministic contiguous slice of ordered manifest entries. */
export function selectBatchRange(input: {
  totalEntries: number;
  batchNumber: number;
  batchSize: number;
  alreadyCovered: number;
}): { startIndex: number; endIndex: number; count: number } | null {
  if (input.batchNumber < 1 || input.batchSize < 1) return null;
  const start = input.alreadyCovered;
  if (start >= input.totalEntries) return null;
  const end = Math.min(start + input.batchSize, input.totalEntries);
  return { startIndex: start, endIndex: end, count: end - start };
}
