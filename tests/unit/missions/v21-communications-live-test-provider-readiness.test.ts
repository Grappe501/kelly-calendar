import { describe, expect, it } from "vitest";
import {
  D26_DEFAULT_LIMITS,
  assertProviderStateForLiveTest,
  classifyProviderOutcome,
  d26ProductionDispatchHardBlock,
  evaluateAtomicLiveTestLaunch,
} from "@/lib/missions/v21/communications/live-tests";
import {
  LG1_PHASE_B_BUILD,
  RESEND_CREDENTIAL_ENV_NAMES,
  assertLiveTestReadyDoesNotEnableTransport,
  classifyAuthenticationOutcome,
  classifyResendCredentialPresence,
  evaluatePhaseBProviderReadiness,
  lg1EffectiveProviderRequestLimit,
  resendLg1CapabilityMatrix,
} from "@/lib/missions/v21/communications/live-tests/provider/provider-readiness-policy";
import {
  d22ProductionDispatchHardBlock,
  defaultProductionSafetyGates,
  resolveCanonicalProvider,
} from "@/lib/missions/v21/communications/providers";
import { d25ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/campaigns";

describe("LG-1 Phase B provider readiness", () => {
  it("identifies the Phase B build and Resend credential env names without values", () => {
    expect(LG1_PHASE_B_BUILD).toContain("PHASE-B-PROVIDER-READINESS");
    expect(RESEND_CREDENTIAL_ENV_NAMES).toEqual([
      "KCCC_RESEND_API_KEY",
      "KCCC_RESEND_WEBHOOK_SECRET",
      "KCCC_RESEND_FROM_EMAIL",
    ]);
  });

  it("classifies missing credentials as NOT_CONFIGURED and blocks readiness", () => {
    const availability = classifyResendCredentialPresence({
      apiKeyPresent: false,
      webhookSecretPresent: false,
      fromEmailPresent: false,
    });
    expect(availability).toBe("NOT_CONFIGURED");
    const auth = classifyAuthenticationOutcome({
      credentialAvailability: availability,
      apiReachability: "NOT_APPLICABLE",
      authenticationClass: "NOT_CONFIGURED",
    });
    expect(auth).toBe("NOT_CONFIGURED");
    const result = evaluatePhaseBProviderReadiness({
      adapterKey: "resend",
      channel: "EMAIL",
      credentialAvailability: auth,
      criticalCapabilitiesOk: true,
      signedWebhookPathExists: true,
      providerMessageReferenceSupported: true,
      duplicateProtectionSupported: true,
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.mayMarkLiveTestReady).toBe(false);
    expect(result.blockingIssues).toContain("CREDENTIALS_NOT_CONFIGURED");
  });

  it("requires AUTHENTICATED before LIVE_TEST_READY may be marked", () => {
    const unverified = evaluatePhaseBProviderReadiness({
      adapterKey: "resend",
      channel: "EMAIL",
      credentialAvailability: "CONFIGURED_UNVERIFIED",
      criticalCapabilitiesOk: true,
      signedWebhookPathExists: true,
      providerMessageReferenceSupported: true,
      duplicateProtectionSupported: true,
    });
    expect(unverified.mayMarkLiveTestReady).toBe(false);

    const ok = evaluatePhaseBProviderReadiness({
      adapterKey: "resend",
      channel: "EMAIL",
      credentialAvailability: "AUTHENTICATED",
      criticalCapabilitiesOk: true,
      signedWebhookPathExists: true,
      providerMessageReferenceSupported: true,
      duplicateProtectionSupported: true,
    });
    expect(ok.status).toBe("PASSED");
    expect(ok.mayMarkLiveTestReady).toBe(true);
    expect(ok.warnings).toEqual(
      expect.arrayContaining([
        "LIVE_TRANSPORT_REMAINS_BLOCKED_BY_KILL_SWITCHES",
        "GENERAL_PRODUCTION_REMAINS_BLOCKED",
      ]),
    );
  });

  it("blocks sandbox harness and SMS for LG-1 Phase B", () => {
    expect(
      evaluatePhaseBProviderReadiness({
        adapterKey: "kccc-sandbox",
        channel: "EMAIL",
        credentialAvailability: "AUTHENTICATED",
        criticalCapabilitiesOk: true,
        signedWebhookPathExists: true,
        providerMessageReferenceSupported: true,
        duplicateProtectionSupported: true,
      }).blockingIssues,
    ).toContain("SANDBOX_HARNESS_NOT_ELIGIBLE_FOR_LIVE_TEST");

    expect(
      evaluatePhaseBProviderReadiness({
        adapterKey: "resend",
        channel: "SMS",
        credentialAvailability: "AUTHENTICATED",
        criticalCapabilitiesOk: true,
        signedWebhookPathExists: true,
        providerMessageReferenceSupported: true,
        duplicateProtectionSupported: true,
      }).mayMarkLiveTestReady,
    ).toBe(false);
  });

  it("documents Resend LG-1 capability matrix without exposing secrets", () => {
    const matrix = resendLg1CapabilityMatrix();
    expect(matrix.emailSend.result).toBe("SUPPORTED");
    expect(matrix.signedWebhooks.result).toBe("SUPPORTED");
    expect(matrix.productionEndpoint.result).toBe("SUPPORTED");
    expect(JSON.stringify(matrix)).not.toMatch(/re_[A-Za-z0-9]/g);
  });

  it("keeps LIVE_TEST_READY from enabling transport or general production", () => {
    const transport = assertLiveTestReadyDoesNotEnableTransport({
      providerState: "LIVE_TEST_READY",
      globalKillSwitch: true,
      channelKillSwitch: true,
      providerKillSwitch: true,
      productionDispatchFlag: false,
    });
    expect(transport.transportBlocked).toBe(true);
    expect(transport.generalProductionBlocked).toBe(true);
    expect(d22ProductionDispatchHardBlock().blocked).toBe(true);
    expect(d25ProductionDispatchHardBlock().blocked).toBe(true);
    expect(d26ProductionDispatchHardBlock().blocked).toBe(true);
    expect(defaultProductionSafetyGates().killSwitchOff).toBe(false);
    expect(defaultProductionSafetyGates().controlledLiveTestApproved).toBe(
      false,
    );
  });

  it("rejects disabled, sandbox-only, revoked, and future-production states for live test", () => {
    for (const state of [
      "DISABLED",
      "SANDBOX_ONLY",
      "REVOKED",
      "PRODUCTION_READY_FUTURE",
    ] as const) {
      expect(assertProviderStateForLiveTest(state).ok).toBe(false);
    }
    expect(assertProviderStateForLiveTest("LIVE_TEST_READY").ok).toBe(true);
  });

  it("enforces LG-1 effective provider request limit of one", () => {
    expect(lg1EffectiveProviderRequestLimit()).toEqual({
      maximumProviderRequests: 1,
      source: "D26 one-time authorization shipped default",
    });
    expect(D26_DEFAULT_LIMITS.maximumProviderRequests).toBe(1);
    expect(D26_DEFAULT_LIMITS.retriesAllowed).toBe(false);
  });

  it("fails closed on unknown provider outcomes without retry", () => {
    const outcome = classifyProviderOutcome({
      submitted: true,
      accepted: false,
      rejected: false,
      timeout: true,
      unknown: true,
    });
    expect(outcome.consumeAuthorization).toBe(true);
    expect(outcome.allowRetry).toBe(false);
    expect(outcome.executionStatus).toBe("UNKNOWN");
  });

  it("blocks launch when scheduled or audience paths are used even if provider is ready", () => {
    const result = evaluateAtomicLiveTestLaunch({
      typedConfirmation: "SEND ONE CONTROLLED TEST",
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
      preflightBase: {
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
        policyExternalDispatchEnabled: true,
        providerMode: "SANDBOX",
        providerDispatchEnabled: true,
        globalKillSwitch: false,
        emailKillSwitch: false,
        smsKillSwitch: false,
        rateLimitExceeded: false,
        renderArtifactId: "a1",
        renderArtifactValid: true,
        arbitraryDestinationOverride: false,
      },
    });
    expect(result.maySubmitProvider).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "SCHEDULED_LIVE_LAUNCH_PROHIBITED",
        "AUDIENCE_MANIFEST_LIVE_LAUNCH_PROHIBITED",
      ]),
    );
  });

  it("refuses Resend production send even when adapter is installed", async () => {
    const resend = resolveCanonicalProvider("resend");
    await resend.initialize();
    const blocked = await resend.send({
      idempotencyKey: "lg1-phase-b-1",
      correlationId: "lg1-b",
      channel: "EMAIL",
      destination: "operator@example.test",
      subject: "phase-b",
      bodyText: "no send",
      bodyHtml: null,
      fromIdentity: null,
      sandboxOnly: false,
      timeoutMs: 1000,
    });
    expect(blocked.outcome).toBe("BLOCKED");
  });
});
