import { createHash } from "node:crypto";
import type { CampaignRevisionSnapshot } from "@/lib/missions/v21/communications/campaigns/campaign-types";

export function campaignRevisionContentHash(
  snapshot: CampaignRevisionSnapshot,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        channel: snapshot.channel,
        compositionId: snapshot.compositionId,
        compositionRevisionId: snapshot.compositionRevisionId,
        recipientManifestId: snapshot.recipientManifestId,
        providerKey: snapshot.providerKey,
        providerMode: snapshot.providerMode,
        timezone: snapshot.timezone,
        purpose: snapshot.purpose,
      }),
    )
    .digest("hex");
}

export function readinessFingerprint(input: {
  campaignRevisionHash: string;
  compositionRevisionId: string;
  recipientManifestId: string;
  manifestHash: string;
  executionPlanId: string;
  providerKey: string;
  providerMode: string;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function authorizationHash(input: {
  campaignRevisionId: string;
  launchReviewId: string;
  readinessHash: string;
  authorizedMode: string;
  authorizedRecipientLimit: number;
  authorizedBatchLimit: number;
  authorizedStartAt: string | null;
  authorizedEndAt: string | null;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function batchContentHash(input: {
  campaignRevisionId: string;
  recipientManifestId: string;
  runId: string;
  batchNumber: number;
  recipientStartIndex: number;
  recipientEndIndex: number;
}): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function completionEvidenceHash(input: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function campaignAttemptIdempotencyKey(input: {
  campaignRevisionId: string;
  executionRunId: string;
  manifestEntryId: string;
  renderArtifactId: string;
  channel: string;
  attemptGeneration: number;
}): string {
  return [
    "d25",
    input.campaignRevisionId,
    input.executionRunId,
    input.manifestEntryId,
    input.renderArtifactId,
    input.channel,
    `g${input.attemptGeneration}`,
  ].join(":");
}
