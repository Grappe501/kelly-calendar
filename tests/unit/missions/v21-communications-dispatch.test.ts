import { describe, expect, it } from "vitest";
import {
  assertDispatchFoundationIsolation,
  dispatchIdempotencyKey,
  evaluateDispatchPreflight,
  getTestDispatchAdapterForUnitTests,
  normalizeTestWebhookEvents,
  resolveProviderAdapter,
  shouldRetryDispatch,
  signTestWebhook,
  verifyHmacSha256Signature,
  verifyTestAdapterWebhook,
  type DispatchPreflightInput,
} from "@/lib/missions/v21/communications";

const BASE: DispatchPreflightInput = {
  communicationId: "c1",
  queueItemId: "q1",
  channel: "EMAIL",
  contentFingerprint: "cf",
  audienceFingerprint: "af",
  policyVersion: 1,
  policyFingerprint: "pf",
  destinationRef: "cp:1",
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
};

describe("D21 communications provider dispatch foundation", () => {
  it("defaults to safe isolation and disabled production dispatch", () => {
    const iso = assertDispatchFoundationIsolation();
    expect(iso.productionDispatchEnabledByDefault).toBe(false);
    expect(iso.fabricatesProviderMessageIds).toBe(false);
    expect(iso.infersConsent).toBe(false);
    expect(iso.durableBackgroundQueue).toBe(false);
  });

  it("blocks preflight when kill switches, approvals, or suppressions fail", () => {
    expect(evaluateDispatchPreflight(BASE).ok).toBe(true);
    expect(
      evaluateDispatchPreflight({ ...BASE, globalKillSwitch: true }).blockingReasonCodes,
    ).toContain("GLOBAL_KILL_SWITCH");
    expect(
      evaluateDispatchPreflight({ ...BASE, suppressionApplies: true })
        .blockingReasonCodes,
    ).toContain("SUPPRESSION_ACTIVE");
    expect(
      evaluateDispatchPreflight({ ...BASE, hasValidContentApproval: false })
        .blockingReasonCodes,
    ).toContain("CONTENT_APPROVAL_INVALID");
    expect(
      evaluateDispatchPreflight({ ...BASE, unknownOutcomeOpen: true })
        .blockingReasonCodes,
    ).toContain("UNKNOWN_OUTCOME_OPEN");
    expect(
      evaluateDispatchPreflight({
        ...BASE,
        policyExternalDispatchEnabled: false,
      }).blockingReasonCodes,
    ).toContain("POLICY_EXTERNAL_DISPATCH_DISABLED");
  });

  it("keeps idempotency keys stable", () => {
    const a = dispatchIdempotencyKey({
      queueItemId: "q1",
      contentFingerprint: "cf",
      audienceFingerprint: "af",
      providerKey: "kccc-test",
    });
    const b = dispatchIdempotencyKey({
      queueItemId: "q1",
      contentFingerprint: "cf",
      audienceFingerprint: "af",
      providerKey: "kccc-test",
    });
    expect(a).toBe(b);
  });

  it("test adapter accepts once and does not duplicate on replay", async () => {
    const adapter = getTestDispatchAdapterForUnitTests();
    const input = {
      queueItemId: "q1",
      channel: "EMAIL" as const,
      destinationRef: "cp:1",
      subject: "Hi",
      bodyText: "Body",
      contentFingerprint: "cf",
      audienceFingerprint: "af",
      idempotencyKey: "idem-1",
      correlationId: "corr-1",
      timeoutMs: 1000,
      mode: "SANDBOX" as const,
    };
    const first = await adapter.dispatch(input);
    const second = await adapter.dispatch(input);
    expect(first.outcome).toBe("ACCEPTED");
    expect(second.outcome).toBe("ACCEPTED");
    if (first.outcome === "ACCEPTED" && second.outcome === "ACCEPTED") {
      expect(first.providerMessageId).toBe(second.providerMessageId);
    }
  });

  it("forbids test adapter production mode and returns unknown on timeout-after-send", async () => {
    const adapter = getTestDispatchAdapterForUnitTests();
    const blocked = await adapter.dispatch({
      queueItemId: "q1",
      channel: "EMAIL",
      destinationRef: "cp:1",
      subject: null,
      bodyText: "x",
      contentFingerprint: "cf",
      audienceFingerprint: "af",
      idempotencyKey: "idem-prod",
      correlationId: "c",
      timeoutMs: 1000,
      mode: "PRODUCTION",
    });
    expect(blocked.outcome).toBe("BLOCKED");

    adapter.setScenario("TIMEOUT_AFTER_POSSIBLE_SEND");
    const unknown = await adapter.dispatch({
      queueItemId: "q2",
      channel: "EMAIL",
      destinationRef: "cp:1",
      subject: null,
      bodyText: "x",
      contentFingerprint: "cf",
      audienceFingerprint: "af",
      idempotencyKey: "idem-unknown",
      correlationId: "c2",
      timeoutMs: 1000,
      mode: "SANDBOX",
    });
    expect(unknown.outcome).toBe("UNKNOWN");
    const reconciled = await adapter.reconcile({
      idempotencyKey: "idem-unknown",
      correlationId: "c2",
      providerMessageId: null,
    });
    expect(reconciled.found).toBe(true);
    expect(reconciled.status).toBe("ACCEPTED");
  });

  it("verifies signed webhooks and rejects invalid/replay fingerprints", () => {
    const rawBody = JSON.stringify({
      eventId: "evt-1",
      occurredAt: "2026-07-20T18:00:00.000Z",
      events: [
        {
          type: "UNSUBSCRIBED",
          providerMessageId: "msg-1",
          occurredAt: "2026-07-20T18:00:00.000Z",
        },
      ],
    });
    const timestamp = String(Math.floor(Date.parse("2026-07-20T18:00:05.000Z") / 1000));
    const secret = "test-webhook-secret";
    const signature = signTestWebhook(secret, timestamp, rawBody);
    const good = verifyTestAdapterWebhook(
      {
        providerKey: "kccc-test",
        rawBody,
        headers: {
          "x-kccc-timestamp": timestamp,
          "x-kccc-signature": signature,
        },
        receivedAtIso: "2026-07-20T18:00:05.000Z",
      },
      secret,
    );
    expect(good.ok).toBe(true);
    expect(good.signatureValid).toBe(true);
    const normalized = normalizeTestWebhookEvents(good);
    expect(normalized[0]?.eventType).toBe("UNSUBSCRIBED");
    expect(normalized[0]?.suppressionAction).toBe("CHANNEL_OPT_OUT");

    const bad = verifyHmacSha256Signature({
      secret,
      timestamp,
      rawBody,
      signatureHex: "00".repeat(32),
      receivedAtIso: "2026-07-20T18:00:05.000Z",
    });
    expect(bad.ok).toBe(false);
  });

  it("treats accepted≠delivered and temporary bounce≠permanent suppression", () => {
    const events = normalizeTestWebhookEvents({
      ok: true,
      providerKey: "kccc-test",
      providerEventId: "e",
      providerEventAt: "2026-07-20T18:00:00.000Z",
      replayFingerprint: "x",
      signatureValid: true,
      rejectionCategory: null,
      events: [
        { type: "ACCEPTED", providerMessageId: "m1", occurredAt: "2026-07-20T18:00:00.000Z" },
        { type: "DELIVERED", providerMessageId: "m1", occurredAt: "2026-07-20T18:01:00.000Z" },
        {
          type: "BOUNCED_TEMPORARY",
          providerMessageId: "m2",
          occurredAt: "2026-07-20T18:02:00.000Z",
        },
        {
          type: "COMPLAINT",
          providerMessageId: "m3",
          occurredAt: "2026-07-20T18:03:00.000Z",
        },
      ],
    });
    expect(events[0]?.eventType).toBe("DISPATCH_ACCEPTED");
    expect(events[1]?.eventType).toBe("DELIVERED");
    expect(events[2]?.suppressionAction).toBe("TEMPORARY_NO_SUPPRESSION");
    expect(events[3]?.suppressionAction).toBe("COMPLAINT");
  });

  it("registry never selects test adapter in production", () => {
    const adapter = resolveProviderAdapter("kccc-test", {
      allowTestAdapter: true,
      nodeEnv: "production",
    });
    expect(adapter.providerKey).toBe("disabled");
    expect(adapter.isTestAdapter).toBe(false);
  });

  it("classifies retryable errors without blind unknown retries", () => {
    expect(shouldRetryDispatch("RATE_LIMIT")).toBe(true);
    expect(shouldRetryDispatch("TIMEOUT_BEFORE_SEND")).toBe(true);
    expect(shouldRetryDispatch("TIMEOUT_AFTER_POSSIBLE_SEND")).toBe(false);
    expect(shouldRetryDispatch("PERMANENT_FAILURE")).toBe(false);
  });
});
