import { describe, expect, it } from "vitest";
import {
  allProductionGatesOpen,
  defaultProductionSafetyGates,
  d22ProductionDispatchHardBlock,
  evaluateProductionSafetyGates,
  getSandboxCertificationProvider,
  hmacSha256Hex,
  listProviderRegistry,
  MULTI_PROVIDER_ROUTING_ARCHITECTURE,
  productionDispatchBlockReason,
  resolveCanonicalProvider,
  resolveProviderAdapter,
} from "@/lib/missions/v21/communications";

describe("D22 communications provider abstraction", () => {
  it("keeps production dispatch hard-blocked and multi-provider routing unimplemented", () => {
    const block = d22ProductionDispatchHardBlock();
    expect(block.blocked).toBe(true);
    expect(block.reason).toContain("DISPATCH BLOCKED");
    expect(MULTI_PROVIDER_ROUTING_ARCHITECTURE.implemented).toBe(false);
    expect(allProductionGatesOpen(defaultProductionSafetyGates())).toBe(false);
    expect(productionDispatchBlockReason(defaultProductionSafetyGates())).toContain(
      "DISPATCH BLOCKED",
    );
  });

  it("registers official adapters and vendor stubs in the provider catalog", () => {
    const registry = listProviderRegistry();
    const keys = registry.map((r) => r.providerKey);
    expect(keys).toContain("disabled");
    expect(keys).toContain("kccc-sandbox");
    expect(keys).toContain("resend");
    expect(keys).toContain("sendgrid");
    expect(keys).toContain("twilio");
    const resend = registry.find((r) => r.providerKey === "resend");
    expect(resend?.isOfficialAdapter).toBe(true);
    expect(resend?.capabilities.productionReady).toBe(false);
    const stub = registry.find((r) => r.providerKey === "sendgrid");
    expect(stub?.isStub).toBe(true);
    expect(stub?.status).toBe("AVAILABLE");
  });

  it("fails closed for unknown providers and refuses production mode on resend", async () => {
    const unknown = resolveProviderAdapter("not-a-vendor");
    expect(unknown.providerKey).toBe("disabled");

    const resend = resolveCanonicalProvider("resend");
    await resend.initialize();
    const blocked = await resend.send({
      idempotencyKey: "prod-1",
      correlationId: "c1",
      channel: "EMAIL",
      destination: "a@b.test",
      subject: "x",
      bodyText: "y",
      bodyHtml: null,
      fromIdentity: null,
      sandboxOnly: false,
      timeoutMs: 1000,
    });
    expect(blocked.outcome).toBe("BLOCKED");
    if (blocked.outcome !== "ACCEPTED") {
      expect(blocked.errorCategory).toBe("PRODUCTION_BLOCKED");
    }  });

  it("certifies kccc-sandbox end-to-end including signed webhooks", async () => {
    const sandbox = getSandboxCertificationProvider();
    await sandbox.initialize();
    const checklist = await sandbox.runSandboxCertification();
    const failed = checklist.filter((c) => !c.passed);
    expect(failed).toEqual([]);
    expect(checklist.some((c) => c.checkId === "WEBHOOK_SIGNATURE")).toBe(true);

    const body = JSON.stringify({
      type: "DELIVERED",
      providerMessageId: "m1",
      occurredAt: new Date().toISOString(),
    });
    const signed = sandbox.signWebhook(body);
    const processed = await sandbox.processWebhook({
      headers: {
        "x-kccc-sandbox-signature": signed.signature,
        "x-kccc-sandbox-timestamp": signed.timestamp,
        "x-kccc-sandbox-event-id": "evt-1",
      },
      rawBody: body,
      receivedAt: new Date().toISOString(),
    });
    expect(processed.validation.valid).toBe(true);
    expect(processed.events[0]?.eventType).toBe("DELIVERED");
  });

  it("rejects webhook replay when signature is wrong", async () => {
    const sandbox = getSandboxCertificationProvider();
    await sandbox.initialize();
    const body = '{"type":"DELIVERED"}';
    const ts = String(Math.floor(Date.now() / 1000));
    const result = await sandbox.validateWebhook({
      headers: {
        "x-kccc-sandbox-signature": hmacSha256Hex("wrong", `${ts}.${body}`),
        "x-kccc-sandbox-timestamp": ts,
        "x-kccc-sandbox-event-id": "evt-bad",
      },
      rawBody: body,
      receivedAt: new Date().toISOString(),
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCategory).toBe("WEBHOOK_INVALID");
    }
  });

  it("evaluates production gates as blocked until every flag is true", () => {
    const partial = {
      ...defaultProductionSafetyGates(),
      sandboxPassed: true,
      senderVerified: true,
      domainVerified: true,
      webhookVerified: true,
    };
    const evaluated = evaluateProductionSafetyGates(partial);
    expect(evaluated.allowed).toBe(false);
    expect(evaluated.blockReason).toContain("Kill Switch OFF");
  });

  it("bridges sandbox adapter into D21 dispatch contract without production", async () => {
    const adapter = resolveProviderAdapter("kccc-sandbox", {
      allowTestAdapter: true,
      nodeEnv: "test",
    });
    expect(adapter.isTestAdapter).toBe(true);
    const result = await adapter.dispatch({
      queueItemId: "q1",
      channel: "EMAIL",
      destinationRef: "sandbox@example.test",
      subject: "t",
      bodyText: "b",
      contentFingerprint: "cf",
      audienceFingerprint: "af",
      idempotencyKey: "idem-d22-1",
      correlationId: "corr-1",
      timeoutMs: 2000,
      mode: "SANDBOX",
    });
    expect(result.outcome).toBe("ACCEPTED");
    if (result.outcome === "ACCEPTED") {
      expect(result.providerMessageId).toMatch(/^sandbox-/);
    }
    const prod = await adapter.dispatch({
      queueItemId: "q1",
      channel: "EMAIL",
      destinationRef: "sandbox@example.test",
      subject: "t",
      bodyText: "b",
      contentFingerprint: "cf",
      audienceFingerprint: "af",
      idempotencyKey: "idem-d22-2",
      correlationId: "corr-2",
      timeoutMs: 2000,
      mode: "PRODUCTION",
    });
    expect(prod.outcome).toBe("BLOCKED");
  });
});
