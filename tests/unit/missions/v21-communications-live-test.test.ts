import { describe, expect, it } from "vitest";
import {
  AUTHORIZE_PHRASE,
  D26_DEFAULT_LIMITS,
  LAUNCH_PHRASE,
  assertProviderStateForLiveTest,
  assertShippedLiveTestLimits,
  classifyProviderOutcome,
  d26ProductionDispatchHardBlock,
  evaluateAtomicLiveTestLaunch,
  evaluateLiveTestReadiness,
  liveTestAuthorizationHash,
  liveTestRevisionHash,
  matchesAuthorizePhrase,
  matchesLaunchPhrase,
  verifyPostTestProductionBlock,
} from "@/lib/missions/v21/communications/live-tests";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";
import { d25ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/campaigns";

const basePreflight = {
  communicationId: "c",
  queueItemId: "q",
  channel: "EMAIL" as const,
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
  policyExternalDispatchEnabled: true,
  providerMode: "SANDBOX" as const,
  providerDispatchEnabled: true,
  globalKillSwitch: false,
  emailKillSwitch: false,
  smsKillSwitch: false,
  rateLimitExceeded: false,
  renderArtifactId: "a1",
  renderArtifactValid: true,
  arbitraryDestinationOverride: false,
};

describe("D26 controlled live-test authorization", () => {
  it("keeps general production blocked across D22–D26 layers", () => {
    expect(d22ProductionDispatchHardBlock().blocked).toBe(true);
    expect(d25ProductionDispatchHardBlock().blocked).toBe(true);
    expect(d26ProductionDispatchHardBlock().blocked).toBe(true);
  });

  it("ships with one recipient / one attempt / no retries / manual only", () => {
    expect(D26_DEFAULT_LIMITS).toEqual({
      maximumRecipients: 1,
      maximumAttempts: 1,
      maximumProviderRequests: 1,
      manualLaunchOnly: true,
      retriesAllowed: false,
    });
    expect(
      assertShippedLiveTestLimits({
        maximumRecipients: 2,
        maximumAttempts: 1,
        maximumProviderRequests: 1,
        manualLaunchOnly: true,
        retriesAllowed: false,
      }).reasons,
    ).toContain("MAXIMUM_RECIPIENTS_MUST_BE_ONE");
    expect(
      assertShippedLiveTestLimits({ ...D26_DEFAULT_LIMITS, retriesAllowed: true })
        .reasons,
    ).toContain("RETRIES_MUST_BE_DISABLED");
  });

  it("only accepts LIVE_TEST_READY provider state", () => {
    expect(assertProviderStateForLiveTest("SANDBOX_ONLY").ok).toBe(false);
    expect(assertProviderStateForLiveTest("PRODUCTION_READY_FUTURE").reasons).toContain(
      "PRODUCTION_READY_FUTURE_UNUSABLE",
    );
    expect(assertProviderStateForLiveTest("LIVE_TEST_READY").ok).toBe(true);
  });

  it("hashes revisions and authorizations deterministically", () => {
    const snap = {
      channel: "EMAIL" as const,
      providerKey: "resend",
      senderProfileKey: "s1",
      domainIdentityKey: "d1",
      compositionRevisionId: "cr1",
      renderArtifactId: "a1",
      recipientAllowlistEntryId: "r1",
    };
    expect(liveTestRevisionHash(snap)).toBe(liveTestRevisionHash(snap));
    const auth = {
      programRevisionId: "rev1",
      readinessHash: "rh",
      providerKey: "resend",
      senderProfileKey: "s1",
      renderArtifactId: "a1",
      recipientId: "r1",
      destinationFingerprint: "df",
      channel: "EMAIL",
      ...D26_DEFAULT_LIMITS,
    };
    expect(liveTestAuthorizationHash(auth)).toBe(liveTestAuthorizationHash(auth));
  });

  it("requires exact typed confirmation phrases", () => {
    expect(matchesAuthorizePhrase(AUTHORIZE_PHRASE)).toBe(true);
    expect(matchesAuthorizePhrase("authorize one live test")).toBe(true);
    expect(matchesAuthorizePhrase("SEND CAMPAIGN")).toBe(false);
    expect(matchesLaunchPhrase(LAUNCH_PHRASE)).toBe(true);
    expect(matchesLaunchPhrase("Launch campaign")).toBe(false);
  });

  it("evaluates readiness and blocks unsafe configurations", () => {
    const ready = evaluateLiveTestReadiness({
      revisionStatus: "APPROVED",
      revisionHash: "h",
      providerState: "LIVE_TEST_READY",
      providerAuthVerified: true,
      senderVerified: true,
      domainVerified: true,
      dkimVerified: true,
      spfVerified: true,
      dmarcSurfaced: true,
      webhookSignatureVerified: true,
      webhookNormalizationVerified: true,
      approvedRecipientCount: 1,
      recipientApproved: true,
      recipientExpired: false,
      recipientRevoked: false,
      consentValid: true,
      consentScopeOk: true,
      consentChannelOk: true,
      consentDestinationOk: true,
      suppressed: false,
      artifactPurposeDispatch: true,
      artifactApproved: true,
      artifactInvalidated: false,
      artifactChannelMatch: true,
      personalizationMatch: true,
      ...D26_DEFAULT_LIMITS,
      scheduledMode: false,
      audienceManifestUsed: false,
      emergencyStopActive: false,
    });
    expect(ready.status).toBe("READY");

    const blocked = evaluateLiveTestReadiness({
      ...ready,
      revisionStatus: "APPROVED",
      revisionHash: "h",
      providerState: "SANDBOX_ONLY",
      providerAuthVerified: false,
      senderVerified: false,
      domainVerified: false,
      dkimVerified: false,
      spfVerified: false,
      dmarcSurfaced: false,
      webhookSignatureVerified: false,
      webhookNormalizationVerified: false,
      approvedRecipientCount: 2,
      recipientApproved: false,
      recipientExpired: true,
      recipientRevoked: true,
      consentValid: false,
      consentScopeOk: false,
      consentChannelOk: false,
      consentDestinationOk: false,
      suppressed: true,
      artifactPurposeDispatch: false,
      artifactApproved: false,
      artifactInvalidated: true,
      artifactChannelMatch: false,
      personalizationMatch: false,
      ...D26_DEFAULT_LIMITS,
      retriesAllowed: true,
      scheduledMode: true,
      audienceManifestUsed: true,
      emergencyStopActive: true,
      maximumRecipients: 1,
      maximumAttempts: 1,
      maximumProviderRequests: 1,
      manualLaunchOnly: true,
    });
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.blockingIssues).toEqual(
      expect.arrayContaining([
        "MORE_THAN_ONE_APPROVED_RECIPIENT",
        "SCHEDULED_LIVE_LAUNCH_PROHIBITED",
        "AUDIENCE_MANIFEST_LIVE_LAUNCH_PROHIBITED",
        "RETRIES_MUST_BE_DISABLED",
      ]),
    );
  });

  it("blocks launch on preflight without consuming authorization", () => {
    const result = evaluateAtomicLiveTestLaunch({
      typedConfirmation: LAUNCH_PHRASE,
      authorizationStatus: "AUTHORIZED",
      authorizationHash: "h",
      expectedAuthorizationHash: "h",
      authorizationExpired: false,
      authorizationRevoked: false,
      alreadyConsumed: false,
      readinessStatus: "READY",
      emergencyStopActive: false,
      scheduledInvocation: false,
      audienceManifestUsed: false,
      ...D26_DEFAULT_LIMITS,
      providerState: "LIVE_TEST_READY",
      preflightBase: {
        ...basePreflight,
        globalKillSwitch: true,
        policyExternalDispatchEnabled: false,
        providerDispatchEnabled: false,
      },
    });
    expect(result.status).toBe("PREFLIGHT_BLOCKED");
    expect(result.consumeAuthorization).toBe(false);
    expect(result.maySubmitProvider).toBe(false);
  });

  it("rejects scheduled and audience-manifest launches", () => {
    const result = evaluateAtomicLiveTestLaunch({
      typedConfirmation: LAUNCH_PHRASE,
      authorizationStatus: "AUTHORIZED",
      authorizationHash: "h",
      expectedAuthorizationHash: "h",
      authorizationExpired: false,
      authorizationRevoked: false,
      alreadyConsumed: false,
      readinessStatus: "READY",
      emergencyStopActive: false,
      scheduledInvocation: true,
      audienceManifestUsed: true,
      ...D26_DEFAULT_LIMITS,
      providerState: "LIVE_TEST_READY",
      preflightBase: basePreflight,
    });
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "SCHEDULED_LIVE_LAUNCH_PROHIBITED",
        "AUDIENCE_MANIFEST_LIVE_LAUNCH_PROHIBITED",
      ]),
    );
  });

  it("fails closed on unknown provider outcomes and never allows retry", () => {
    const unknown = classifyProviderOutcome({
      submitted: true,
      accepted: false,
      rejected: false,
      timeout: true,
      unknown: true,
    });
    expect(unknown.executionStatus).toBe("UNKNOWN");
    expect(unknown.consumeAuthorization).toBe(true);
    expect(unknown.allowRetry).toBe(false);
    expect(unknown.incidentType).toBe("UNKNOWN_PROVIDER_OUTCOME");
  });

  it("verifies post-test production block restoration", () => {
    const ok = verifyPostTestProductionBlock({
      authorizationConsumed: true,
      productionDispatchFlag: false,
      productionCampaignModeEnabled: false,
      scheduledIngressEnabled: false,
      audienceLiveDispatchEnabled: false,
      killSwitchesActive: true,
      generalProductionPermissionExists: false,
    });
    expect(ok.ok).toBe(true);
    expect(ok.failedClosed).toBe(false);

    const bad = verifyPostTestProductionBlock({
      authorizationConsumed: false,
      productionDispatchFlag: true,
      productionCampaignModeEnabled: true,
      scheduledIngressEnabled: true,
      audienceLiveDispatchEnabled: true,
      killSwitchesActive: false,
      generalProductionPermissionExists: true,
    });
    expect(bad.ok).toBe(false);
    expect(bad.failedClosed).toBe(true);
    expect(bad.incidentTypes).toContain("PRODUCTION_BLOCK_FAILURE");
  });
});
