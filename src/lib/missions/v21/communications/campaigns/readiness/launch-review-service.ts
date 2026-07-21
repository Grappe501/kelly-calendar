import { assertSandboxExecutionMode } from "@/lib/missions/v21/communications/campaigns/campaign-policy";
import type { CommExecutionMode } from "@/lib/missions/v21/communications/campaigns/campaign-types";
import { readinessFingerprint } from "@/lib/missions/v21/communications/campaigns/revisions/campaign-revision-fingerprint";
import { validateScheduleWindow } from "@/lib/missions/v21/communications/campaigns/planning/schedule-validator";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";

export type ReadinessInput = {
  campaignRevisionHash: string;
  campaignRevisionStatus: string;
  compositionRevisionId: string | null;
  compositionApproved: boolean;
  recipientManifestId: string | null;
  manifestStatus: string | null;
  manifestHash: string | null;
  manifestChannel: string | null;
  campaignChannel: string;
  executionPlanId: string;
  executionMode: CommExecutionMode;
  providerKey: string;
  providerMode: string;
  timezone: string;
  scheduledStartAt: Date | string | null;
  scheduledEndAt: Date | string | null;
  consentServiceReachable: boolean;
  suppressionServiceReachable: boolean;
  providerSandboxCertified: boolean;
  killSwitchesBlocking: boolean;
  unresolvedDestinationConflicts: boolean;
  recipientCount: number;
  maximumRecipients: number;
  /** TEST_ONLY campaigns may run sandbox drills without bound production artifacts */
  testOnlySandboxDrill?: boolean;
};

export type ReadinessResult = {
  status: "READY" | "BLOCKED";
  blockingIssues: string[];
  warnings: string[];
  readinessHash: string;
  checks: Record<string, { ok: boolean; detail: string }>;
};

export function evaluateLaunchReadiness(input: ReadinessInput): ReadinessResult {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const checks: ReadinessResult["checks"] = {};

  const modeGate = assertSandboxExecutionMode(input.executionMode);
  checks.executionMode = {
    ok: input.executionMode === "MANUAL_SANDBOX" || input.executionMode === "SCHEDULED_SANDBOX",
    detail: modeGate.reasons.join(", "),
  };
  if (!checks.executionMode.ok) blocking.push(...modeGate.reasons);

  checks.campaignRevision = {
    ok: input.campaignRevisionStatus === "APPROVED",
    detail: input.campaignRevisionStatus,
  };
  if (!checks.campaignRevision.ok) blocking.push("CAMPAIGN_REVISION_NOT_APPROVED");

  checks.composition = {
    ok:
      (Boolean(input.compositionRevisionId) && input.compositionApproved) ||
      Boolean(input.testOnlySandboxDrill),
    detail: input.compositionRevisionId ?? (input.testOnlySandboxDrill ? "test-only-drill" : "missing"),
  };
  if (!checks.composition.ok) blocking.push("COMPOSITION_NOT_APPROVED");

  checks.manifest = {
    ok:
      (Boolean(input.recipientManifestId) &&
        input.manifestStatus === "APPROVED" &&
        Boolean(input.manifestHash)) ||
      Boolean(input.testOnlySandboxDrill),
    detail: input.testOnlySandboxDrill
      ? "test-only-drill"
      : `${input.manifestStatus ?? "missing"}`,
  };
  if (!checks.manifest.ok) blocking.push("MANIFEST_NOT_APPROVED");
  if (input.manifestStatus === "REVOKED") blocking.push("MANIFEST_REVOKED");
  if (input.manifestStatus === "EXPIRED") blocking.push("MANIFEST_EXPIRED");
  if (input.testOnlySandboxDrill) {
    warnings.push("TEST_ONLY_SANDBOX_DRILL_WITHOUT_BOUND_ARTIFACTS");
  }

  checks.channelMatch = {
    ok:
      !input.manifestChannel ||
      input.manifestChannel === input.campaignChannel,
    detail: `${input.campaignChannel}/${input.manifestChannel ?? "n/a"}`,
  };
  if (!checks.channelMatch.ok) blocking.push("CHANNEL_MISMATCH");

  checks.conflicts = {
    ok: !input.unresolvedDestinationConflicts,
    detail: input.unresolvedDestinationConflicts ? "conflicts" : "clear",
  };
  if (!checks.conflicts.ok) blocking.push("UNRESOLVED_DESTINATION_CONFLICTS");

  checks.volume = {
    ok: input.recipientCount <= input.maximumRecipients,
    detail: `${input.recipientCount}/${input.maximumRecipients}`,
  };
  if (!checks.volume.ok) blocking.push("RECIPIENT_COUNT_EXCEEDS_LIMIT");

  checks.consent = {
    ok: input.consentServiceReachable,
    detail: input.consentServiceReachable ? "reachable" : "unreachable",
  };
  if (!checks.consent.ok) blocking.push("CONSENT_SERVICE_UNAVAILABLE");

  checks.suppression = {
    ok: input.suppressionServiceReachable,
    detail: input.suppressionServiceReachable ? "reachable" : "unreachable",
  };
  if (!checks.suppression.ok) blocking.push("SUPPRESSION_SERVICE_UNAVAILABLE");

  checks.provider = {
    ok:
      input.providerMode === "SANDBOX" &&
      input.providerSandboxCertified &&
      input.providerKey.length > 0,
    detail: `${input.providerKey}/${input.providerMode}`,
  };
  if (input.providerMode === "PRODUCTION") {
    blocking.push("PRODUCTION_MODE_NOT_AUTHORIZED");
  }
  if (!checks.provider.ok) blocking.push("PROVIDER_SANDBOX_NOT_READY");

  const schedule = validateScheduleWindow({
    timezone: input.timezone,
    scheduledStartAt: input.scheduledStartAt,
    scheduledEndAt: input.scheduledEndAt,
  });
  checks.schedule = {
    ok: schedule.ok,
    detail: schedule.errors.join(",") || "ok",
  };
  if (!schedule.ok) blocking.push(...schedule.errors);
  warnings.push(...schedule.warnings);

  checks.killSwitches = {
    ok: true,
    detail: input.killSwitchesBlocking
      ? "kill switches ON (expected for production block)"
      : "reviewed",
  };
  warnings.push("KILL_SWITCHES_REMAIN_ENFORCED_AT_DISPATCH");

  const hard = d22ProductionDispatchHardBlock();
  checks.production = {
    ok: false,
    detail: hard.reason,
  };
  blocking.push("PRODUCTION_DISPATCH_BLOCKED");

  const readinessHash = readinessFingerprint({
    campaignRevisionHash: input.campaignRevisionHash,
    compositionRevisionId: input.compositionRevisionId ?? "",
    recipientManifestId: input.recipientManifestId ?? "",
    manifestHash: input.manifestHash ?? "",
    executionPlanId: input.executionPlanId,
    providerKey: input.providerKey,
    providerMode: input.providerMode,
  });

  // READY only when the only remaining hard block is the intentional production block
  // plus sandbox-mode assertions that still include PRODUCTION_DISPATCH_BLOCKED.
  const nonProdBlocks = blocking.filter(
    (c) =>
      c !== "PRODUCTION_DISPATCH_BLOCKED" &&
      c !== "PRODUCTION_MODE_NOT_AUTHORIZED" &&
      c !== "PRODUCTION_KILL_SWITCH_ACTIVE" &&
      c !== "PRODUCTION_PROVIDER_NOT_ENABLED",
  );
  const sandboxOk =
    (input.executionMode === "MANUAL_SANDBOX" ||
      input.executionMode === "SCHEDULED_SANDBOX") &&
    nonProdBlocks.length === 0;

  return {
    status: sandboxOk ? "READY" : "BLOCKED",
    blockingIssues: [...new Set(blocking)],
    warnings: [...new Set(warnings)],
    readinessHash,
    checks,
  };
}
