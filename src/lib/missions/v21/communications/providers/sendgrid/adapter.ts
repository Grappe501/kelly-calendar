import { bridgeCanonicalToDispatchAdapter } from "@/lib/missions/v21/communications/providers/base/dispatch-bridge";
import { emptyHealth } from "@/lib/missions/v21/communications/providers/base/provider-health";
import { replayFingerprint } from "@/lib/missions/v21/communications/providers/base/dispatch-bridge";
import type { CanonicalCommunicationsProvider } from "@/lib/missions/v21/communications/providers/base/provider-interface";
import type {
  CredentialCheck,
  NormalizedProviderEvent,
  ProviderCapabilityMatrix,
  ProviderHealthReport,
  ProviderLifecycleStatus,
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

export type StubProviderSpec = {
  providerKey: string;
  displayName: string;
  capabilities: ProviderCapabilityMatrix;
  operatorNotes: string[];
};

/**
 * Available-but-not-installed vendor stub.
 * Implements the canonical interface and refuses all I/O until a future deliverable.
 */
export class StubVendorProvider implements CanonicalCommunicationsProvider {
  readonly isOfficialAdapter = false;
  readonly isSandboxOnly = true;
  readonly isStub = true;
  readonly providerKey: string;
  readonly displayName: string;
  private readonly capabilities: ProviderCapabilityMatrix;
  private readonly operatorNotes: string[];

  constructor(spec: StubProviderSpec) {
    this.providerKey = spec.providerKey;
    this.displayName = spec.displayName;
    this.capabilities = spec.capabilities;
    this.operatorNotes = spec.operatorNotes;
  }

  getCapabilities() {
    return this.capabilities;
  }

  async initialize(): Promise<void> {}

  async verify(): Promise<ProviderVerifyResult> {
    return {
      ok: false,
      verifiedAt: new Date().toISOString(),
      mode: "DISABLED",
      errorCategory: "NOT_CONFIGURED",
      redactedSummary: `${this.displayName} stub — not installed in D22.`,
    };
  }

  async health(): Promise<ProviderHealthReport> {
    const status: ProviderLifecycleStatus = "AVAILABLE";
    return emptyHealth(this.providerKey, status, [
      ...this.operatorNotes,
      "Stub adapter only — implement full adapter in a future pass.",
    ]);
  }

  async preflight() {
    return { ok: false, blockingReasons: ["STUB_PROVIDER"] };
  }

  async send(_input: ProviderSendInput): Promise<ProviderSendResult> {
    return {
      outcome: "BLOCKED",
      errorCategory: "STUB_PROVIDER",
      redactedSummary: `${this.displayName} stub refuses sends.`,
      retryable: false,
      latencyMs: 0,
    };
  }

  async cancel() {
    return { ok: false, redactedSummary: "Stub." };
  }

  async status(_input: ProviderStatusQuery): Promise<ProviderStatusResult> {
    return {
      found: false,
      state: "NOT_FOUND",
      lastEventAt: null,
      redactedSummary: "Stub has no status.",
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
      redactedSummary: "Stub — no suppression API.",
    };
  }

  async validateWebhook(
    input: WebhookValidationInput,
  ): Promise<WebhookValidationResult> {
    return {
      valid: false,
      errorCategory: "STUB_PROVIDER",
      redactedSummary: "Stub rejects webhooks.",
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
        envKey: `(future) ${this.providerKey.toUpperCase()}_API_KEY`,
        status: "MISSING",
        operatorWarning: "Stub — do not configure until adapter is implemented.",
      },
    ];
  }

  async runSandboxCertification(): Promise<SandboxCertificationCheckResult[]> {
    return [
      {
        checkId: "AUTHENTICATION",
        passed: false,
        detail: "Stub cannot certify.",
        latencyMs: null,
      },
    ];
  }

  async shutdown(): Promise<void> {}

  asDispatchAdapter() {
    return bridgeCanonicalToDispatchAdapter(this, {
      isTestAdapter: true,
      supportedChannels: this.capabilities.sms ? ["EMAIL", "SMS"] : ["EMAIL"],
      capabilityVersion: `d22-stub-${this.providerKey}-1`,
    });
  }
}

const emailCaps = (
  partial: Partial<ProviderCapabilityMatrix> = {},
): ProviderCapabilityMatrix => ({
  email: true,
  sms: false,
  mms: false,
  attachments: true,
  bulkSend: true,
  rateLimits: true,
  webhookSupport: true,
  sandboxSupport: true,
  dedicatedIp: false,
  domainVerification: true,
  suppressionApi: true,
  analytics: true,
  pricingKnown: false,
  productionReady: false,
  ...partial,
});

export const STUB_PROVIDER_SPECS: StubProviderSpec[] = [
  {
    providerKey: "sendgrid",
    displayName: "SendGrid",
    capabilities: emailCaps({ dedicatedIp: true }),
    operatorNotes: ["Available stub — not installed."],
  },
  {
    providerKey: "mailgun",
    displayName: "Mailgun",
    capabilities: emailCaps(),
    operatorNotes: ["Available stub — not installed."],
  },
  {
    providerKey: "postmark",
    displayName: "Postmark",
    capabilities: emailCaps({ bulkSend: false }),
    operatorNotes: ["Available stub — not installed."],
  },
  {
    providerKey: "amazon-ses",
    displayName: "Amazon SES",
    capabilities: emailCaps({ dedicatedIp: true, sandboxSupport: true }),
    operatorNotes: ["Available stub — not installed."],
  },
  {
    providerKey: "twilio",
    displayName: "Twilio",
    capabilities: emailCaps({
      email: false,
      sms: true,
      mms: true,
      attachments: true,
      domainVerification: false,
    }),
    operatorNotes: ["Available stub — SMS/MMS future."],
  },
  {
    providerKey: "mailersend",
    displayName: "MailerSend",
    capabilities: emailCaps(),
    operatorNotes: ["Available stub — not installed."],
  },
];
