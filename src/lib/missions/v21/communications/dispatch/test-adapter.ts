import { createHash } from "node:crypto";
import { evaluateDispatchPreflight } from "@/lib/missions/v21/communications/dispatch/preflight";
import {
  normalizeTestWebhookEvents,
  verifyTestAdapterWebhook,
} from "@/lib/missions/v21/communications/dispatch/webhook";
import type {
  ApprovedDispatchInput,
  CommunicationProviderAdapter,
  DispatchPreflightInput,
  DispatchReconciliationInput,
  ProviderCapabilityReport,
  ProviderConfigurationState,
  ProviderConnectionResult,
  ProviderDispatchResult,
  RawWebhookInput,
  SenderValidationInput,
} from "@/lib/missions/v21/communications/dispatch/types";

export type TestAdapterScenario =
  | "ACCEPT"
  | "REJECT_PERMANENT"
  | "REJECT_TRANSIENT"
  | "RATE_LIMIT"
  | "TIMEOUT_BEFORE_SEND"
  | "TIMEOUT_AFTER_POSSIBLE_SEND";

/**
 * Deterministic server-only test adapter.
 * Never makes network calls. Cannot be selected for production.
 */
export class DeterministicTestDispatchAdapter
  implements CommunicationProviderAdapter
{
  providerKey = "kccc-test";
  supportedChannels: CommunicationProviderAdapter["supportedChannels"] = [
    "EMAIL",
    "SMS",
  ];
  isTestAdapter = true;

  private readonly webhookSecret: string;
  private scenario: TestAdapterScenario;
  private readonly accepted = new Map<
    string,
    { providerMessageId: string; acceptedAt: string }
  >();

  constructor(options?: {
    webhookSecret?: string;
    scenario?: TestAdapterScenario;
  }) {
    this.webhookSecret = options?.webhookSecret ?? "test-webhook-secret";
    this.scenario = options?.scenario ?? "ACCEPT";
  }

  setScenario(scenario: TestAdapterScenario) {
    this.scenario = scenario;
  }

  async inspectConfiguration(): Promise<ProviderConfigurationState> {
    return {
      providerKey: this.providerKey,
      mode: "SANDBOX",
      configured: true,
      credentialsPresent: true,
      credentialsVerified: true,
      senderVerified: true,
      sandboxAvailable: true,
      applicationDispatchEnabled: false,
      webhooksEnabled: true,
      notes: [
        "Deterministic test adapter — sandbox only.",
        "Cannot be selected as a production provider.",
      ],
    };
  }

  async verifyConnection(): Promise<ProviderConnectionResult> {
    return {
      ok: true,
      mode: "SANDBOX",
      verifiedAt: new Date().toISOString(),
      errorCategory: null,
      redactedSummary: "Test adapter connection simulated.",
    };
  }

  async discoverCapabilities(): Promise<ProviderCapabilityReport> {
    return {
      providerKey: this.providerKey,
      capabilityVersion: "d21-test-1",
      flags: {
        ADAPTER_IMPLEMENTED: "SUPPORTED",
        CONFIGURATION_PRESENT: "SUPPORTED",
        CREDENTIALS_VERIFIED: "SUPPORTED",
        SENDER_VERIFIED: "SUPPORTED",
        SANDBOX_AVAILABLE: "SUPPORTED",
        EMAIL_ENABLED: "SUPPORTED",
        SMS_ENABLED: "SUPPORTED",
        BATCH_DISPATCH: "SUPPORTED",
        NATIVE_IDEMPOTENCY: "SUPPORTED",
        STATUS_RECONCILIATION: "SUPPORTED",
        SIGNED_WEBHOOKS: "SUPPORTED",
        DELIVERY_EVENTS: "SUPPORTED",
        BOUNCE: "SUPPORTED",
        COMPLAINT: "SUPPORTED",
        UNSUBSCRIBE: "SUPPORTED",
        REPLY: "UNSUPPORTED",
        CLICK_TRACKING: "DISABLED",
        SUPPRESSION_SYNC: "SUPPORTED",
        PRODUCTION_DISPATCH_APPLICATION_ENABLED: "DISABLED",
      },
    };
  }

  async validateSender(input: SenderValidationInput) {
    if (!input.senderIdentity) {
      return { ok: false, verified: false, reasonCodes: ["SENDER_MISSING"] };
    }
    return { ok: true, verified: true, reasonCodes: [] };
  }

  async preflight(input: DispatchPreflightInput) {
    return evaluateDispatchPreflight(input);
  }

  async dispatch(input: ApprovedDispatchInput): Promise<ProviderDispatchResult> {
    if (input.mode === "PRODUCTION") {
      return {
        outcome: "BLOCKED",
        errorCategory: "TEST_ADAPTER_PRODUCTION_FORBIDDEN",
        completedAt: new Date().toISOString(),
      };
    }
    const existing = this.accepted.get(input.idempotencyKey);
    if (existing) {
      return {
        outcome: "ACCEPTED",
        providerMessageId: existing.providerMessageId,
        acceptedAt: existing.acceptedAt,
      };
    }

    if (this.scenario === "TIMEOUT_BEFORE_SEND") {
      return {
        outcome: "UNKNOWN",
        errorCategory: "TIMEOUT_BEFORE_SEND",
        completedAt: new Date().toISOString(),
      };
    }
    if (this.scenario === "TIMEOUT_AFTER_POSSIBLE_SEND") {
      const providerMessageId = `test-maybe-${createHash("sha256")
        .update(input.idempotencyKey)
        .digest("hex")
        .slice(0, 16)}`;
      this.accepted.set(input.idempotencyKey, {
        providerMessageId,
        acceptedAt: new Date().toISOString(),
      });
      return {
        outcome: "UNKNOWN",
        errorCategory: "TIMEOUT_AFTER_POSSIBLE_SEND",
        completedAt: new Date().toISOString(),
      };
    }
    if (this.scenario === "RATE_LIMIT") {
      return {
        outcome: "REJECTED",
        errorCategory: "RATE_LIMIT",
        permanent: false,
        completedAt: new Date().toISOString(),
      };
    }
    if (this.scenario === "REJECT_TRANSIENT") {
      return {
        outcome: "REJECTED",
        errorCategory: "TRANSIENT_FAILURE",
        permanent: false,
        completedAt: new Date().toISOString(),
      };
    }
    if (this.scenario === "REJECT_PERMANENT") {
      return {
        outcome: "REJECTED",
        errorCategory: "PERMANENT_FAILURE",
        permanent: true,
        completedAt: new Date().toISOString(),
      };
    }

    const acceptedAt = new Date().toISOString();
    const providerMessageId = `test-${createHash("sha256")
      .update(input.idempotencyKey)
      .digest("hex")
      .slice(0, 20)}`;
    this.accepted.set(input.idempotencyKey, { providerMessageId, acceptedAt });
    return { outcome: "ACCEPTED", providerMessageId, acceptedAt };
  }

  async reconcile(input: DispatchReconciliationInput) {
    const row = this.accepted.get(input.idempotencyKey);
    if (!row) {
      return { found: false, providerMessageId: null, status: "NOT_FOUND" as const };
    }
    return {
      found: true,
      providerMessageId: row.providerMessageId,
      status: "ACCEPTED" as const,
    };
  }

  async verifyWebhook(input: RawWebhookInput) {
    return verifyTestAdapterWebhook(input, this.webhookSecret);
  }

  async normalizeWebhook(input: Awaited<ReturnType<typeof verifyTestAdapterWebhook>>) {
    return normalizeTestWebhookEvents(input);
  }
}
