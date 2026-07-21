/**
 * D22 canonical provider types — provider-neutral Campaign OS surface.
 * Adapters implement these contracts; vendor SDKs stay behind adapters.
 */

export type ProviderLifecycleStatus =
  | "AVAILABLE"
  | "INSTALLED"
  | "VERIFIED"
  | "SANDBOX_READY"
  | "PRODUCTION_READY"
  | "DISABLED"
  | "RETIRED";

export type ProviderChannelCapability = {
  email: boolean;
  sms: boolean;
  mms: boolean;
  attachments: boolean;
  bulkSend: boolean;
};

export type ProviderCapabilityMatrix = ProviderChannelCapability & {
  rateLimits: boolean;
  webhookSupport: boolean;
  sandboxSupport: boolean;
  dedicatedIp: boolean;
  domainVerification: boolean;
  suppressionApi: boolean;
  analytics: boolean;
  pricingKnown: boolean;
  productionReady: boolean;
};

export type ProviderRegistryEntry = {
  providerKey: string;
  displayName: string;
  status: ProviderLifecycleStatus;
  capabilities: ProviderCapabilityMatrix;
  isOfficialAdapter: boolean;
  isSandboxOnly: boolean;
  isStub: boolean;
  operatorNotes: string[];
};

export type CredentialVaultStatus =
  | "PRESENT"
  | "MISSING"
  | "MALFORMED"
  | "EXPIRED"
  | "REVOKED"
  | "INSUFFICIENT_SCOPE"
  | "ROTATION_NEEDED"
  | "NOT_APPLICABLE";

export type CredentialCheck = {
  envKey: string;
  status: CredentialVaultStatus;
  operatorWarning: string | null;
};

export type ProviderHealthReport = {
  providerKey: string;
  currentStatus: ProviderLifecycleStatus;
  apiReachability: "OK" | "DEGRADED" | "DOWN" | "UNKNOWN" | "NOT_APPLICABLE";
  authentication: CredentialVaultStatus;
  domainVerified: boolean;
  senderVerified: boolean;
  webhookVerified: boolean;
  sandboxWorking: boolean;
  productionEnabled: boolean;
  averageLatencyMs: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  rateLimits: string | null;
  webhookDelayMs: number | null;
  clockDriftSeconds: number | null;
  credentialAgeDays: number | null;
  certificateExpirationAt: string | null;
  suppressionSyncAgeMinutes: number | null;
  notes: string[];
};

export type ProviderVerifyResult = {
  ok: boolean;
  verifiedAt: string;
  mode: "SANDBOX" | "DISABLED" | "PRODUCTION_BLOCKED";
  errorCategory: string | null;
  redactedSummary: string;
};

export type NormalizedProviderEventType =
  | "DELIVERED"
  | "BOUNCED"
  | "COMPLAINED"
  | "OPENED"
  | "CLICKED"
  | "FAILED"
  | "ACCEPTED"
  | "DEFERRED"
  | "UNSUPPORTED";

export type NormalizedProviderEvent = {
  eventType: NormalizedProviderEventType;
  providerMessageId: string | null;
  occurredAt: string;
  suppressionAction:
    | "NONE"
    | "CHANNEL_OPT_OUT"
    | "COMPLAINT"
    | "INVALID_DESTINATION"
    | "TEMPORARY_NO_SUPPRESSION";
  rawHint?: string;
};

export type ProviderSendInput = {
  idempotencyKey: string;
  correlationId: string;
  channel: "EMAIL" | "SMS" | "MMS";
  destination: string;
  subject: string | null;
  bodyText: string;
  bodyHtml: string | null;
  fromIdentity: string | null;
  sandboxOnly: boolean;
  timeoutMs: number;
};

export type ProviderSendResult =
  | {
      outcome: "ACCEPTED";
      providerMessageId: string;
      acceptedAt: string;
      latencyMs: number;
    }
  | {
      outcome: "REJECTED_PERMANENT" | "REJECTED_TRANSIENT" | "RATE_LIMITED" | "TIMEOUT" | "BLOCKED";
      errorCategory: string;
      redactedSummary: string;
      retryable: boolean;
      latencyMs: number;
    };

export type ProviderStatusQuery = {
  providerMessageId: string;
  idempotencyKey?: string;
};

export type ProviderStatusResult = {
  found: boolean;
  state: string;
  lastEventAt: string | null;
  redactedSummary: string;
};

export type SuppressionSyncResult = {
  ok: boolean;
  importedCount: number;
  exportedCount: number;
  syncedAt: string;
  redactedSummary: string;
};

export type WebhookValidationInput = {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
  receivedAt: string;
};

export type WebhookValidationResult =
  | {
      valid: true;
      providerEventId: string | null;
      providerEventAt: string | null;
      replayFingerprint: string;
      clockSkewSeconds: number;
    }
  | {
      valid: false;
      errorCategory: string;
      redactedSummary: string;
      replayFingerprint: string;
    };

export type SandboxCertificationCheckId =
  | "AUTHENTICATION"
  | "SEND"
  | "RECEIVE"
  | "BOUNCE"
  | "COMPLAINT"
  | "DELIVERY"
  | "SUPPRESSION"
  | "RETRY"
  | "DUPLICATE_PREVENTION"
  | "REPLAY_ATTACK_PROTECTION"
  | "LATENCY"
  | "ORDERING"
  | "WEBHOOK_SIGNATURE"
  | "TIMESTAMP_VALIDATION"
  | "FAILURE_RECOVERY";

export type SandboxCertificationCheckResult = {
  checkId: SandboxCertificationCheckId;
  passed: boolean;
  detail: string;
  latencyMs: number | null;
};

export type ProductionSafetyGates = {
  productionProviderSelected: boolean;
  sandboxPassed: boolean;
  senderVerified: boolean;
  domainVerified: boolean;
  webhookVerified: boolean;
  killSwitchOff: boolean;
  operatorApproval: boolean;
  campaignApproval: boolean;
  finalConfirmation: boolean;
  controlledLiveTestApproved: boolean;
};

export const PRODUCTION_GATE_KEYS = [
  "productionProviderSelected",
  "sandboxPassed",
  "senderVerified",
  "domainVerified",
  "webhookVerified",
  "killSwitchOff",
  "operatorApproval",
  "campaignApproval",
  "finalConfirmation",
  "controlledLiveTestApproved",
] as const satisfies ReadonlyArray<keyof ProductionSafetyGates>;

export type MultiProviderRoutingArchitecture = {
  implemented: false;
  futureSupport: ReadonlyArray<
    | "PRIMARY"
    | "SECONDARY"
    | "AUTOMATIC_FAILOVER"
    | "PRIORITY_ROUTING"
    | "COST_OPTIMIZATION"
    | "GEOGRAPHIC_ROUTING"
    | "EMERGENCY_ROUTING"
    | "WEIGHTED_ROUTING"
    | "AB_TESTING"
  >;
};

export const MULTI_PROVIDER_ROUTING_ARCHITECTURE: MultiProviderRoutingArchitecture =
  {
    implemented: false,
    futureSupport: [
      "PRIMARY",
      "SECONDARY",
      "AUTOMATIC_FAILOVER",
      "PRIORITY_ROUTING",
      "COST_OPTIMIZATION",
      "GEOGRAPHIC_ROUTING",
      "EMERGENCY_ROUTING",
      "WEIGHTED_ROUTING",
      "AB_TESTING",
    ],
  };
