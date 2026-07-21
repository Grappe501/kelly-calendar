import { evaluateDispatchPreflight } from "@/lib/missions/v21/communications/dispatch/preflight";
import type {
  ApprovedDispatchInput,
  CommunicationProviderAdapter,
  DispatchPreflightInput,
  DispatchReconciliationInput,
  ProviderCapabilityReport,
  ProviderConfigurationState,
  ProviderConnectionResult,
  RawWebhookInput,
  SenderValidationInput,
  VerifiedWebhookResult,
} from "@/lib/missions/v21/communications/dispatch/types";

/** Production-safe default — never sends. */
export class DisabledDispatchProviderAdapter
  implements CommunicationProviderAdapter
{
  providerKey = "disabled";
  supportedChannels: CommunicationProviderAdapter["supportedChannels"] = [
    "EMAIL",
    "SMS",
    "MANUAL",
  ];
  isTestAdapter = false;

  async inspectConfiguration(): Promise<ProviderConfigurationState> {
    return {
      providerKey: this.providerKey,
      mode: "DISABLED",
      configured: false,
      credentialsPresent: false,
      credentialsVerified: false,
      senderVerified: false,
      sandboxAvailable: false,
      applicationDispatchEnabled: false,
      webhooksEnabled: false,
      notes: [
        "No production provider selected.",
        "D21 ships with external dispatch disabled.",
      ],
    };
  }

  async verifyConnection(): Promise<ProviderConnectionResult> {
    return {
      ok: false,
      mode: "DISABLED",
      verifiedAt: null,
      errorCategory: "NOT_CONFIGURED",
      redactedSummary: "No provider credentials configured.",
    };
  }

  async discoverCapabilities(): Promise<ProviderCapabilityReport> {
    const flags = {
      ADAPTER_IMPLEMENTED: "SUPPORTED",
      CONFIGURATION_PRESENT: "UNSUPPORTED",
      CREDENTIALS_VERIFIED: "UNSUPPORTED",
      SENDER_VERIFIED: "UNSUPPORTED",
      SANDBOX_AVAILABLE: "UNSUPPORTED",
      EMAIL_ENABLED: "DISABLED",
      SMS_ENABLED: "DISABLED",
      BATCH_DISPATCH: "SUPPORTED",
      NATIVE_IDEMPOTENCY: "UNSUPPORTED",
      STATUS_RECONCILIATION: "UNSUPPORTED",
      SIGNED_WEBHOOKS: "UNSUPPORTED",
      DELIVERY_EVENTS: "UNSUPPORTED",
      BOUNCE: "UNSUPPORTED",
      COMPLAINT: "UNSUPPORTED",
      UNSUBSCRIBE: "UNSUPPORTED",
      REPLY: "UNSUPPORTED",
      CLICK_TRACKING: "DISABLED",
      SUPPRESSION_SYNC: "SUPPORTED",
      PRODUCTION_DISPATCH_APPLICATION_ENABLED: "DISABLED",
    } as ProviderCapabilityReport["flags"];
    return {
      providerKey: this.providerKey,
      flags,
      capabilityVersion: "d21-disabled-1",
    };
  }

  async validateSender(_input: SenderValidationInput) {
    return { ok: false, verified: false, reasonCodes: ["PROVIDER_DISABLED"] };
  }

  async preflight(input: DispatchPreflightInput) {
    const base = evaluateDispatchPreflight({
      ...input,
      providerMode: "DISABLED",
      providerDispatchEnabled: false,
    });
    return {
      ok: false,
      blockingReasonCodes: [
        ...new Set([...base.blockingReasonCodes, "PROVIDER_DISABLED"]),
      ],
      warningReasonCodes: base.warningReasonCodes,
    };
  }

  async dispatch(_input: ApprovedDispatchInput) {
    return {
      outcome: "BLOCKED" as const,
      errorCategory: "PROVIDER_DISABLED",
      completedAt: new Date().toISOString(),
    };
  }

  async reconcile(_input: DispatchReconciliationInput) {
    return {
      found: false,
      providerMessageId: null,
      status: "NOT_FOUND" as const,
    };
  }

  async verifyWebhook(input: RawWebhookInput): Promise<VerifiedWebhookResult> {
    return {
      ok: false,
      providerKey: input.providerKey,
      providerEventId: null,
      providerEventAt: null,
      replayFingerprint: `disabled:${input.providerKey}`,
      signatureValid: false,
      rejectionCategory: "PROVIDER_WEBHOOKS_DISABLED",
      events: [],
    };
  }

  async normalizeWebhook() {
    return [];
  }
}
