import type { CampaignCommChannel } from "@/lib/missions/v21/communications/types";

export type CommProviderMode = "DISABLED" | "SANDBOX" | "PRODUCTION";

export type ProviderConfigurationState = {
  providerKey: string;
  mode: CommProviderMode;
  configured: boolean;
  credentialsPresent: boolean;
  credentialsVerified: boolean;
  senderVerified: boolean;
  sandboxAvailable: boolean;
  applicationDispatchEnabled: boolean;
  webhooksEnabled: boolean;
  notes: string[];
};

export type ProviderConnectionResult = {
  ok: boolean;
  mode: CommProviderMode;
  verifiedAt: string | null;
  errorCategory: string | null;
  redactedSummary: string | null;
};

export type ProviderCapabilityFlag =
  | "ADAPTER_IMPLEMENTED"
  | "CONFIGURATION_PRESENT"
  | "CREDENTIALS_VERIFIED"
  | "SENDER_VERIFIED"
  | "SANDBOX_AVAILABLE"
  | "EMAIL_ENABLED"
  | "SMS_ENABLED"
  | "BATCH_DISPATCH"
  | "NATIVE_IDEMPOTENCY"
  | "STATUS_RECONCILIATION"
  | "SIGNED_WEBHOOKS"
  | "DELIVERY_EVENTS"
  | "BOUNCE"
  | "COMPLAINT"
  | "UNSUBSCRIBE"
  | "REPLY"
  | "CLICK_TRACKING"
  | "SUPPRESSION_SYNC"
  | "PRODUCTION_DISPATCH_APPLICATION_ENABLED";

export type ProviderCapabilityReport = {
  providerKey: string;
  flags: Record<ProviderCapabilityFlag, "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN" | "DISABLED">;
  capabilityVersion: string;
};

export type SenderValidationInput = {
  channel: CampaignCommChannel;
  senderIdentity: string | null;
};

export type SenderValidationResult = {
  ok: boolean;
  verified: boolean;
  reasonCodes: string[];
};

export type DispatchPreflightInput = {
  communicationId: string;
  queueItemId: string;
  channel: CampaignCommChannel;
  contentFingerprint: string;
  audienceFingerprint: string;
  policyVersion: number | null;
  policyFingerprint: string | null;
  destinationRef: string | null;
  hasValidContentApproval: boolean;
  hasValidAudienceApproval: boolean;
  hasValidDispatchApproval: boolean;
  communicationActive: boolean;
  communicationCancelled: boolean;
  queuePrepared: boolean;
  alreadyDispatched: boolean;
  contactActive: boolean;
  contactVerified: boolean;
  consentEffective: boolean;
  suppressionApplies: boolean;
  destinationChanged: boolean;
  mobilizeLinkValid: boolean | null;
  unknownOutcomeOpen: boolean;
  policyExternalDispatchEnabled: boolean;
  providerMode: CommProviderMode;
  providerDispatchEnabled: boolean;
  globalKillSwitch: boolean;
  emailKillSwitch: boolean;
  smsKillSwitch: boolean;
  rateLimitExceeded: boolean;
};

export type DispatchPreflightResult = {
  ok: boolean;
  blockingReasonCodes: string[];
  warningReasonCodes: string[];
};

export type ApprovedDispatchInput = {
  queueItemId: string;
  channel: CampaignCommChannel;
  destinationRef: string;
  subject: string | null;
  bodyText: string | null;
  /** D23 — preferred; when present, adapters transport artifact fields only. */
  renderArtifactId?: string | null;
  bodyHtml?: string | null;
  contentFingerprint: string;
  audienceFingerprint: string;
  idempotencyKey: string;
  correlationId: string;
  timeoutMs: number;
  mode: CommProviderMode;
};

export type ProviderDispatchResult =
  | {
      outcome: "ACCEPTED";
      providerMessageId: string;
      acceptedAt: string;
    }
  | {
      outcome: "REJECTED";
      errorCategory: string;
      permanent: boolean;
      completedAt: string;
    }
  | {
      outcome: "UNKNOWN";
      errorCategory: string;
      completedAt: string;
    }
  | {
      outcome: "BLOCKED";
      errorCategory: string;
      completedAt: string;
    };

export type DispatchReconciliationInput = {
  idempotencyKey: string;
  correlationId: string;
  providerMessageId: string | null;
};

export type DispatchReconciliationResult = {
  found: boolean;
  providerMessageId: string | null;
  status: "ACCEPTED" | "REJECTED" | "UNKNOWN" | "NOT_FOUND";
};

export type RawWebhookInput = {
  providerKey: string;
  rawBody: string;
  headers: Record<string, string>;
  receivedAtIso: string;
};

export type VerifiedWebhookResult = {
  ok: boolean;
  providerKey: string;
  providerEventId: string | null;
  providerEventAt: string | null;
  replayFingerprint: string;
  signatureValid: boolean;
  rejectionCategory: string | null;
  /** Server-only parsed event; never returned to clients. */
  events: Array<{
    type: string;
    providerMessageId: string | null;
    occurredAt: string;
  }>;
};

export type NormalizedDeliveryEventType =
  | "DISPATCH_ACCEPTED"
  | "DISPATCH_REJECTED"
  | "DELIVERED"
  | "BOUNCED"
  | "FAILED"
  | "COMPLAINT"
  | "UNSUBSCRIBED"
  | "REPLIED"
  | "CLICKED"
  | "UNSUPPORTED";

export type NormalizedDeliveryEvent = {
  eventType: NormalizedDeliveryEventType;
  providerMessageId: string | null;
  occurredAt: string;
  suppressionAction:
    | "NONE"
    | "CHANNEL_OPT_OUT"
    | "COMPLAINT"
    | "INVALID_DESTINATION"
    | "TEMPORARY_NO_SUPPRESSION";
};

export interface CommunicationProviderAdapter {
  providerKey: string;
  supportedChannels: CampaignCommChannel[];
  /** Test adapters must return true — cannot be selected for production. */
  isTestAdapter: boolean;

  inspectConfiguration(): Promise<ProviderConfigurationState>;
  verifyConnection(): Promise<ProviderConnectionResult>;
  discoverCapabilities(): Promise<ProviderCapabilityReport>;
  validateSender(input: SenderValidationInput): Promise<SenderValidationResult>;
  preflight(input: DispatchPreflightInput): Promise<DispatchPreflightResult>;
  dispatch(input: ApprovedDispatchInput): Promise<ProviderDispatchResult>;
  reconcile(input: DispatchReconciliationInput): Promise<DispatchReconciliationResult>;
  verifyWebhook(input: RawWebhookInput): Promise<VerifiedWebhookResult>;
  normalizeWebhook(input: VerifiedWebhookResult): Promise<NormalizedDeliveryEvent[]>;
}

export const DEFAULT_MAX_BATCH_SIZE = 25;
export const DEFAULT_DISPATCH_TIMEOUT_MS = 10_000;
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

export function assertDispatchFoundationIsolation() {
  return {
    mutatesEvent: false,
    mutatesMission: false,
    mutatesPrepare: false,
    mutatesExecute: false,
    mutatesDebrief: false,
    mutatesFollowUp: false,
    mutatesTravel: false,
    mutatesLogistics: false,
    mutatesFieldOps: false,
    mutatesIncidents: false,
    mutatesExceptionDigest: false,
    mutatesStaffing: false,
    mutatesCloseout: false,
    mutatesLaunchReview: false,
    mutatesDayLaunch: false,
    writesMobilizePeople: false,
    writesMobilizeAttendance: false,
    writesMobilizeEvents: false,
    infersConsent: false,
    bypassesSuppression: false,
    fabricatesProviderMessageIds: false,
    productionDispatchEnabledByDefault: false,
    durableBackgroundQueue: false,
  } as const;
}
