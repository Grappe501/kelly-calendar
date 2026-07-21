import { describe, expect, it } from "vitest";
import {
  assertBatchWithinLimits,
  assertCampaignExecutionGate,
  assertRetryAllowed,
  assertSandboxExecutionMode,
  authorizationHash,
  batchContentHash,
  campaignAttemptIdempotencyKey,
  campaignRevisionContentHash,
  canCreateNewBatches,
  classifyRetryFailure,
  completionEvidenceHash,
  d25ProductionDispatchHardBlock,
  evaluateLaunchReadiness,
  isRecognizedTimezone,
  normalizeRatePolicy,
  runCampaignAttemptPreflight,
  selectBatchRange,
  transitionCampaignStatus,
  transitionRunStatus,
  validateScheduleWindow,
} from "@/lib/missions/v21/communications/campaigns";
import { evaluateDispatchPreflight } from "@/lib/missions/v21/communications/dispatch";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";

describe("D25 communications campaign execution", () => {
  it("only enables sandbox execution modes", () => {
    expect(assertSandboxExecutionMode("MANUAL_SANDBOX").reasons).toContain(
      "PRODUCTION_DISPATCH_BLOCKED",
    );
    expect(assertSandboxExecutionMode("PRODUCTION").reasons).toContain(
      "PRODUCTION_MODE_NOT_AUTHORIZED",
    );
    expect(assertSandboxExecutionMode("CONTROLLED_LIVE_TEST").reasons).toContain(
      "CONTROLLED_LIVE_TEST_NOT_AVAILABLE",
    );
    expect(d25ProductionDispatchHardBlock().blocked).toBe(true);
  });

  it("hashes campaign revisions and authorizations deterministically", () => {
    const snap = {
      channel: "EMAIL" as const,
      compositionId: "c1",
      compositionRevisionId: "cr1",
      recipientManifestId: "m1",
      providerKey: "kccc-sandbox",
      providerMode: "SANDBOX",
      timezone: "America/Chicago",
      purpose: "test",
    };
    expect(campaignRevisionContentHash(snap)).toBe(
      campaignRevisionContentHash(snap),
    );
    const auth = {
      campaignRevisionId: "r1",
      launchReviewId: "lr1",
      readinessHash: "rh",
      authorizedMode: "MANUAL_SANDBOX",
      authorizedRecipientLimit: 10,
      authorizedBatchLimit: 5,
      authorizedStartAt: null,
      authorizedEndAt: null,
    };
    expect(authorizationHash(auth)).toBe(authorizationHash(auth));
    expect(batchContentHash({
      campaignRevisionId: "r1",
      recipientManifestId: "m1",
      runId: "run1",
      batchNumber: 1,
      recipientStartIndex: 0,
      recipientEndIndex: 5,
    })).toHaveLength(64);
    expect(
      campaignAttemptIdempotencyKey({
        campaignRevisionId: "r1",
        executionRunId: "run1",
        manifestEntryId: "e1",
        renderArtifactId: "a1",
        channel: "EMAIL",
        attemptGeneration: 1,
      }),
    ).toContain("d25:");
  });

  it("validates timezones and schedule windows", () => {
    expect(isRecognizedTimezone("America/Chicago")).toBe(true);
    expect(isRecognizedTimezone("Not/AZone")).toBe(false);
    expect(
      validateScheduleWindow({
        timezone: "America/Chicago",
        scheduledStartAt: new Date("2030-01-02T00:00:00Z"),
        scheduledEndAt: new Date("2030-01-01T00:00:00Z"),
      }).errors,
    ).toContain("START_MUST_PRECEDE_END");
    expect(
      validateScheduleWindow({
        timezone: "America/Chicago",
        scheduledStartAt: new Date("2030-01-01T00:00:00Z"),
        scheduledEndAt: new Date("2030-01-10T00:00:00Z"),
        dailyWindowStart: "25:00",
        dailyWindowEnd: "09:00",
      }).errors,
    ).toContain("INVALID_DAILY_WINDOW");
    expect(
      validateScheduleWindow({
        timezone: "America/Chicago",
        scheduledStartAt: new Date("2030-01-01T00:00:00Z"),
        scheduledEndAt: new Date("2030-01-10T00:00:00Z"),
        blackouts: [
          {
            startsAt: new Date("2020-01-01T00:00:00Z"),
            endsAt: new Date("2099-01-01T00:00:00Z"),
          },
        ],
      }).errors,
    ).toContain("WITHIN_BLACKOUT");
  });

  it("enforces rate and deterministic batch selection", () => {
    const policy = normalizeRatePolicy({ maximumBatchSize: 5, maximumRecipients: 10 });
    expect(
      assertBatchWithinLimits({
        policy,
        authorizationRecipientLimit: 10,
        authorizationBatchLimit: 5,
        plannedCount: 6,
        attemptsAlreadyCreated: 0,
        attemptsInLastHour: 0,
        secondsSinceLastBatch: null,
      }).reasons,
    ).toContain("BATCH_SIZE_EXCEEDED");
    const range = selectBatchRange({
      totalEntries: 12,
      batchNumber: 1,
      batchSize: 5,
      alreadyCovered: 0,
    });
    expect(range).toEqual({ startIndex: 0, endIndex: 5, count: 5 });
    const range2 = selectBatchRange({
      totalEntries: 12,
      batchNumber: 2,
      batchSize: 5,
      alreadyCovered: 5,
    });
    expect(range2?.startIndex).toBe(5);
  });

  it("evaluates launch readiness and blocks production", () => {
    const ready = evaluateLaunchReadiness({
      campaignRevisionHash: "h",
      campaignRevisionStatus: "APPROVED",
      compositionRevisionId: "cr",
      compositionApproved: true,
      recipientManifestId: "m",
      manifestStatus: "APPROVED",
      manifestHash: "mh",
      manifestChannel: "EMAIL",
      campaignChannel: "EMAIL",
      executionPlanId: "p",
      executionMode: "MANUAL_SANDBOX",
      providerKey: "kccc-sandbox",
      providerMode: "SANDBOX",
      timezone: "America/Chicago",
      scheduledStartAt: new Date("2030-01-01T00:00:00Z"),
      scheduledEndAt: new Date("2030-01-10T00:00:00Z"),
      consentServiceReachable: true,
      suppressionServiceReachable: true,
      providerSandboxCertified: true,
      killSwitchesBlocking: true,
      unresolvedDestinationConflicts: false,
      recipientCount: 5,
      maximumRecipients: 10,
    });
    expect(ready.status).toBe("READY");
    expect(ready.blockingIssues).toContain("PRODUCTION_DISPATCH_BLOCKED");

    const blocked = evaluateLaunchReadiness({
      campaignRevisionHash: "h",
      campaignRevisionStatus: "APPROVED",
      compositionRevisionId: "cr",
      compositionApproved: true,
      recipientManifestId: "m",
      manifestStatus: "REVOKED",
      manifestHash: "mh",
      manifestChannel: "EMAIL",
      campaignChannel: "EMAIL",
      executionPlanId: "p",
      executionMode: "PRODUCTION",
      providerKey: "resend",
      providerMode: "PRODUCTION",
      timezone: "America/Chicago",
      scheduledStartAt: new Date("2030-01-01T00:00:00Z"),
      scheduledEndAt: new Date("2030-01-10T00:00:00Z"),
      consentServiceReachable: false,
      suppressionServiceReachable: false,
      providerSandboxCertified: false,
      killSwitchesBlocking: true,
      unresolvedDestinationConflicts: true,
      recipientCount: 50,
      maximumRecipients: 10,
    });
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.blockingIssues).toContain("MANIFEST_REVOKED");
    expect(blocked.blockingIssues).toContain("PRODUCTION_MODE_NOT_AUTHORIZED");
    expect(blocked.blockingIssues).toContain("CONSENT_SERVICE_UNAVAILABLE");
  });

  it("enforces state machine and pause/cancel gates", () => {
    expect(transitionCampaignStatus("DRAFT", "APPROVED").ok).toBe(false);
    expect(transitionCampaignStatus("READY_FOR_REVIEW", "APPROVED").ok).toBe(true);
    expect(transitionRunStatus("COMPLETED", "RUNNING").ok).toBe(false);
    expect(canCreateNewBatches("PAUSED")).toBe(false);
    expect(canCreateNewBatches("RUNNING")).toBe(true);
    const gate = assertCampaignExecutionGate({
      runStatus: "RUNNING",
      campaignCancelled: false,
      campaignPaused: false,
      authorizationRevoked: false,
      authorizationExpired: false,
      authorizedStartAt: new Date("2020-01-01"),
      authorizedEndAt: new Date("2099-01-01"),
      executionMode: "MANUAL_SANDBOX",
      providerMode: "SANDBOX",
      sandboxAllowlisted: true,
      killSwitchBlocks: false,
    });
    expect(gate.ok).toBe(true);
    expect(
      assertCampaignExecutionGate({
        runStatus: "CANCELLED",
        campaignCancelled: true,
        campaignPaused: false,
        authorizationRevoked: true,
        authorizationExpired: true,
        authorizedStartAt: null,
        authorizedEndAt: null,
        executionMode: "PRODUCTION",
        providerMode: "PRODUCTION",
        sandboxAllowlisted: false,
        killSwitchBlocks: true,
      }).reasons,
    ).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_CANCELLED",
        "AUTHORIZATION_REVOKED",
        "PRODUCTION_MODE_NOT_AUTHORIZED",
        "RECIPIENT_NOT_SANDBOX_ALLOWLISTED",
      ]),
    );
  });

  it("classifies retries and requires operator approval", () => {
    expect(classifyRetryFailure(["CONSENT_INEFFECTIVE"])).toBe("NON_RETRYABLE");
    expect(classifyRetryFailure(["PROVIDER_TIMEOUT"])).toBe("RETRYABLE");
    expect(
      assertRetryAllowed({
        classification: "RETRYABLE",
        existingRetryCount: 0,
        maximumRetries: 1,
        operatorApproved: false,
        requireOperatorApproval: true,
        windowOpen: true,
      }).reasons,
    ).toContain("RETRY_REQUIRES_OPERATOR_APPROVAL");
  });

  it("calls D21 preflight for campaign attempts and keeps production blocked", () => {
    const result = runCampaignAttemptPreflight(
      {
        communicationId: "c",
        queueItemId: "q",
        channel: "EMAIL",
        contentFingerprint: "cf",
        audienceFingerprint: "af",
        policyVersion: 1,
        policyFingerprint: "pf",
        destinationRef: "ref",
        hasValidContentApproval: true,
        hasValidAudienceApproval: true,
        hasValidDispatchApproval: true,
        communicationActive: true,
        communicationCancelled: false,
        queuePrepared: true,
        alreadyDispatched: false,
        contactActive: true,
        contactVerified: true,
        consentEffective: true,
        suppressionApplies: false,
        destinationChanged: false,
        mobilizeLinkValid: null,
        unknownOutcomeOpen: false,
        policyExternalDispatchEnabled: false,
        providerMode: "SANDBOX",
        providerDispatchEnabled: false,
        globalKillSwitch: true,
        emailKillSwitch: true,
        smsKillSwitch: true,
        rateLimitExceeded: false,
        recipientManifestId: "m1",
        recipientManifestApproved: true,
        recipientManifestEntryId: "e1",
        recipientManifestEntryMatches: true,
        destinationFingerprintMatches: true,
        channelMatchesManifest: true,
        personalizationIntegrityOk: true,
        renderArtifactId: "a1",
        renderArtifactValid: true,
        arbitraryDestinationOverride: true,
      },
      {
        campaignId: "camp1",
        campaignRevisionApproved: true,
        launchAuthorizationValid: true,
        executionRunActive: true,
        executionBatchActive: true,
        insideAuthorizedWindow: true,
        campaignPaused: false,
        campaignCancelled: false,
        sandboxAllowlisted: true,
      },
    );
    expect(result.ok).toBe(false);
    expect(result.blockingReasonCodes).toContain(
      "ARBITRARY_DESTINATION_OVERRIDE_REJECTED",
    );
    expect(result.blockingReasonCodes).toContain("GLOBAL_KILL_SWITCH");

    const expired = evaluateDispatchPreflight({
      communicationId: "c",
      queueItemId: "q",
      channel: "EMAIL",
      contentFingerprint: "cf",
      audienceFingerprint: "af",
      policyVersion: 1,
      policyFingerprint: "pf",
      destinationRef: "ref",
      hasValidContentApproval: true,
      hasValidAudienceApproval: true,
      hasValidDispatchApproval: true,
      communicationActive: true,
      communicationCancelled: false,
      queuePrepared: true,
      alreadyDispatched: false,
      contactActive: true,
      contactVerified: true,
      consentEffective: false,
      suppressionApplies: true,
      destinationChanged: false,
      mobilizeLinkValid: null,
      unknownOutcomeOpen: false,
      policyExternalDispatchEnabled: true,
      providerMode: "SANDBOX",
      providerDispatchEnabled: true,
      globalKillSwitch: false,
      emailKillSwitch: false,
      smsKillSwitch: false,
      rateLimitExceeded: false,
      campaignId: "camp1",
      campaignRevisionApproved: true,
      launchAuthorizationValid: false,
      executionRunActive: true,
      executionBatchActive: true,
      insideAuthorizedWindow: false,
      campaignPaused: true,
      campaignCancelled: false,
      sandboxAllowlisted: false,
    });
    expect(expired.blockingReasonCodes).toEqual(
      expect.arrayContaining([
        "CONSENT_INEFFECTIVE",
        "SUPPRESSION_ACTIVE",
        "LAUNCH_AUTHORIZATION_INVALID",
        "OUTSIDE_AUTHORIZED_WINDOW",
        "CAMPAIGN_PAUSED",
        "RECIPIENT_NOT_SANDBOX_ALLOWLISTED",
      ]),
    );
    expect(d22ProductionDispatchHardBlock().blocked).toBe(true);
    expect(completionEvidenceHash({ a: 1 })).toHaveLength(64);
  });
});
