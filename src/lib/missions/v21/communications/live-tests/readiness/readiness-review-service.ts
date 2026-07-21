import type { LiveTestReadinessInput } from "@/lib/missions/v21/communications/live-tests/live-test-types";
import {
  assertProviderStateForLiveTest,
  assertShippedLiveTestLimits,
  d26ProductionDispatchHardBlock,
} from "@/lib/missions/v21/communications/live-tests/live-test-policy";
import { readinessEvidenceHash } from "@/lib/missions/v21/communications/live-tests/revisions/live-test-revision-fingerprint";

export type LiveTestReadinessResult = {
  status: "READY" | "BLOCKED";
  blockingIssues: string[];
  warnings: string[];
  readinessHash: string;
  checks: Record<string, { ok: boolean; detail: string }>;
};

export function evaluateLiveTestReadiness(
  input: LiveTestReadinessInput,
): LiveTestReadinessResult {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const checks: LiveTestReadinessResult["checks"] = {};

  checks.revision = {
    ok: input.revisionStatus === "APPROVED",
    detail: input.revisionStatus,
  };
  if (!checks.revision.ok) blocking.push("REVISION_NOT_APPROVED");

  const provider = assertProviderStateForLiveTest(input.providerState);
  checks.provider = {
    ok: provider.ok && input.providerAuthVerified,
    detail: input.providerState,
  };
  if (!provider.ok) blocking.push(...provider.reasons.filter((r) => r !== "GENERAL_PRODUCTION_DISPATCH_BLOCKED"));
  if (!input.providerAuthVerified) blocking.push("PROVIDER_AUTH_UNVERIFIED");

  checks.sender = {
    ok: input.senderVerified,
    detail: input.senderVerified ? "verified" : "unverified",
  };
  if (!checks.sender.ok) blocking.push("SENDER_IDENTITY_UNVERIFIED");

  checks.domain = {
    ok: input.domainVerified && input.dkimVerified && input.spfVerified,
    detail: `dkim=${input.dkimVerified};spf=${input.spfVerified};dmarc=${input.dmarcSurfaced}`,
  };
  if (!input.domainVerified) blocking.push("DOMAIN_UNVERIFIED");
  if (!input.dkimVerified) blocking.push("DKIM_REQUIRED");
  if (!input.spfVerified) blocking.push("SPF_OR_ALIGNMENT_REQUIRED");
  if (!input.dmarcSurfaced) warnings.push("DMARC_NOT_SURFACED");

  checks.webhook = {
    ok: input.webhookSignatureVerified && input.webhookNormalizationVerified,
    detail: `sig=${input.webhookSignatureVerified};norm=${input.webhookNormalizationVerified}`,
  };
  if (!input.webhookSignatureVerified) blocking.push("WEBHOOK_SIGNATURE_UNVERIFIED");
  if (!input.webhookNormalizationVerified) {
    blocking.push("WEBHOOK_NORMALIZATION_UNVERIFIED");
  }

  checks.recipient = {
    ok:
      input.approvedRecipientCount === 1 &&
      input.recipientApproved &&
      !input.recipientExpired &&
      !input.recipientRevoked,
    detail: `approvedCount=${input.approvedRecipientCount}`,
  };
  if (input.approvedRecipientCount !== 1) {
    blocking.push(
      input.approvedRecipientCount > 1
        ? "MORE_THAN_ONE_APPROVED_RECIPIENT"
        : "NO_APPROVED_RECIPIENT",
    );
  }
  if (input.recipientExpired) blocking.push("RECIPIENT_EXPIRED");
  if (input.recipientRevoked) blocking.push("RECIPIENT_REVOKED");

  checks.consent = {
    ok:
      input.consentValid &&
      input.consentScopeOk &&
      input.consentChannelOk &&
      input.consentDestinationOk,
    detail: "live-test consent",
  };
  if (!input.consentValid) blocking.push("LIVE_TEST_CONSENT_REQUIRED");
  if (!input.consentScopeOk) blocking.push("CONSENT_SCOPE_MISMATCH");
  if (!input.consentChannelOk) blocking.push("CONSENT_CHANNEL_MISMATCH");
  if (!input.consentDestinationOk) blocking.push("CONSENT_DESTINATION_MISMATCH");
  if (input.suppressed) blocking.push("SUPPRESSION_ACTIVE");

  checks.artifact = {
    ok:
      input.artifactPurposeDispatch &&
      input.artifactApproved &&
      !input.artifactInvalidated &&
      input.artifactChannelMatch &&
      input.personalizationMatch,
    detail: "dispatch artifact",
  };
  if (!input.artifactPurposeDispatch) blocking.push("ARTIFACT_WRONG_PURPOSE");
  if (!input.artifactApproved) blocking.push("ARTIFACT_NOT_APPROVED");
  if (input.artifactInvalidated) blocking.push("ARTIFACT_INVALIDATED");
  if (!input.artifactChannelMatch) blocking.push("ARTIFACT_CHANNEL_MISMATCH");
  if (!input.personalizationMatch) {
    blocking.push("PERSONALIZATION_INTEGRITY_MISMATCH");
  }

  const limits = assertShippedLiveTestLimits({
    maximumRecipients: input.maximumRecipients,
    maximumAttempts: input.maximumAttempts,
    maximumProviderRequests: input.maximumProviderRequests,
    manualLaunchOnly: input.manualLaunchOnly,
    retriesAllowed: input.retriesAllowed,
  });
  checks.limits = { ok: limits.ok, detail: limits.reasons.join(",") || "ok" };
  if (!limits.ok) blocking.push(...limits.reasons);

  if (input.scheduledMode) blocking.push("SCHEDULED_LIVE_LAUNCH_PROHIBITED");
  if (input.audienceManifestUsed) {
    blocking.push("AUDIENCE_MANIFEST_LIVE_LAUNCH_PROHIBITED");
  }
  if (input.emergencyStopActive) blocking.push("EMERGENCY_STOP_ACTIVE");

  blocking.push(d26ProductionDispatchHardBlock().reason.includes("DISPATCH")
    ? "GENERAL_PRODUCTION_DISPATCH_BLOCKED"
    : "GENERAL_PRODUCTION_DISPATCH_BLOCKED");
  warnings.push("ACCEPTED_DOES_NOT_EQUAL_DELIVERED");

  const readinessHash = readinessEvidenceHash({
    revisionHash: input.revisionHash,
    providerState: input.providerState,
    sender: input.senderVerified,
    domain: input.domainVerified,
    webhook: input.webhookSignatureVerified,
    recipientCount: input.approvedRecipientCount,
    consent: input.consentValid,
    artifact: input.artifactApproved,
  });

  const nonProd = blocking.filter(
    (c) => c !== "GENERAL_PRODUCTION_DISPATCH_BLOCKED",
  );

  return {
    status: nonProd.length === 0 ? "READY" : "BLOCKED",
    blockingIssues: [...new Set(blocking)],
    warnings: [...new Set(warnings)],
    readinessHash,
    checks,
  };
}
