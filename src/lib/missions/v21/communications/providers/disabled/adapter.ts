import { bridgeCanonicalToDispatchAdapter } from "@/lib/missions/v21/communications/providers/base/dispatch-bridge";
import { emptyHealth } from "@/lib/missions/v21/communications/providers/base/provider-health";
import type { CanonicalCommunicationsProvider } from "@/lib/missions/v21/communications/providers/base/provider-interface";
import type {
  CredentialCheck,
  NormalizedProviderEvent,
  ProviderHealthReport,
  ProviderSendInput,
  ProviderSendResult,
  ProviderStatusQuery,
  ProviderStatusResult,
  ProviderVerifyResult,
  SandboxCertificationCheckResult,
  SuppressionSyncResult,
  WebhookValidationInput,
  WebhookValidationResult,
} from "@/lib/missions/v21/communications/providers/base/provider-types";
import { replayFingerprint } from "@/lib/missions/v21/communications/providers/base/dispatch-bridge";

/** Fail-closed disabled provider — default when nothing is selected. */
export class DisabledProviderAdapter implements CanonicalCommunicationsProvider {
  readonly providerKey = "disabled";
  readonly displayName = "Disabled";
  readonly isOfficialAdapter = false;
  readonly isSandboxOnly = true;
  readonly isStub = false;

  async initialize(): Promise<void> {}

  async verify(): Promise<ProviderVerifyResult> {
    return {
      ok: false,
      verifiedAt: new Date().toISOString(),
      mode: "DISABLED",
      errorCategory: "NOT_CONFIGURED",
      redactedSummary: "No provider selected — dispatch remains disabled.",
    };
  }

  async health(): Promise<ProviderHealthReport> {
    return emptyHealth(this.providerKey, "DISABLED", [
      "Default fail-closed provider.",
    ]);
  }

  async preflight() {
    return { ok: false, blockingReasons: ["PROVIDER_DISABLED"] };
  }

  async send(input: ProviderSendInput): Promise<ProviderSendResult> {
    return {
      outcome: "BLOCKED",
      errorCategory: "PROVIDER_DISABLED",
      redactedSummary: "Disabled provider refuses all sends.",
      retryable: false,
      latencyMs: 0,
    };
  }

  async cancel() {
    return { ok: false, redactedSummary: "Disabled." };
  }

  async status(_input: ProviderStatusQuery): Promise<ProviderStatusResult> {
    return {
      found: false,
      state: "NOT_FOUND",
      lastEventAt: null,
      redactedSummary: "Disabled provider has no status.",
    };
  }

  async batchStatus(inputs: ProviderStatusQuery[]) {
    return Promise.all(inputs.map((i) => this.status(i)));
  }

  async syncSuppressions(): Promise<SuppressionSyncResult> {
    return {
      ok: false,
      importedCount: 0,
      exportedCount: 0,
      syncedAt: new Date().toISOString(),
      redactedSummary: "Disabled — no suppression sync.",
    };
  }

  async validateWebhook(
    input: WebhookValidationInput,
  ): Promise<WebhookValidationResult> {
    return {
      valid: false,
      errorCategory: "PROVIDER_DISABLED",
      redactedSummary: "Disabled provider rejects webhooks.",
      replayFingerprint: replayFingerprint(this.providerKey, null, input.rawBody),
    };
  }

  async processWebhook(input: WebhookValidationInput) {
    return {
      validation: await this.validateWebhook(input),
      events: [] as NormalizedProviderEvent[],
    };
  }

  normalizeDelivery() {
    return null;
  }
  normalizeBounce() {
    return null;
  }
  normalizeComplaint() {
    return null;
  }
  normalizeOpen() {
    return null;
  }
  normalizeClick() {
    return null;
  }
  normalizeFailure() {
    return null;
  }

  async inspectCredentials(): Promise<CredentialCheck[]> {
    return [
      {
        envKey: "(none)",
        status: "NOT_APPLICABLE",
        operatorWarning: null,
      },
    ];
  }

  async runSandboxCertification(): Promise<SandboxCertificationCheckResult[]> {
    return [
      {
        checkId: "AUTHENTICATION",
        passed: false,
        detail: "Disabled provider cannot certify.",
        latencyMs: null,
      },
    ];
  }

  async shutdown(): Promise<void> {}

  asDispatchAdapter() {
    return bridgeCanonicalToDispatchAdapter(this, {
      isTestAdapter: false,
      supportedChannels: ["EMAIL"],
      capabilityVersion: "d22-disabled-1",
    });
  }
}
