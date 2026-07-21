import {
  OPERATOR_NOTICE,
  NO_INFERENCE_NOTICE,
} from "@/lib/missions/v21/communications/types";
import type { ProviderCapabilityStatus } from "@/lib/missions/v21/communications/provider-adapter";

export const COMMUNICATION_NOTICES = [OPERATOR_NOTICE, NO_INFERENCE_NOTICE] as const;

export async function commJsonFetch<T = unknown>(
  url: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: { message?: string };
  };
  if (!res.ok || json.ok === false) {
    throw new Error(json?.error?.message || "Request failed.");
  }
  return json as T;
}

export type CommunicationListItem = {
  id: string;
  title: string;
  purpose: string;
  channel: string;
  status: string;
  missionId: string | null;
  eventId: string | null;
  campaignDateKey: string | null;
  isStale: boolean;
  eligibilityCounts: Record<string, number>;
  audienceApproved: boolean;
  contentApproved: boolean;
  queueCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CommunicationDetail = {
  communication: {
    id: string;
    title: string;
    purpose: string;
    channel: string;
    status: string;
    subject: string | null;
    bodyText: string | null;
    mobilizeEventUrl: string | null;
    mobilizeEventReferenceId: string | null;
    missionId: string | null;
    eventId: string | null;
    staffingPlanId: string | null;
    campaignDateKey: string | null;
    contentFingerprint: string | null;
    audienceFingerprint: string | null;
    policyVersion: number | null;
    policyFingerprint: string | null;
    isStale: boolean;
    staleReason: string | null;
    mission: {
      id: string;
      title: string;
      startsAt: string;
      endsAt: string;
      sourceEventId: string;
    } | null;
  };
  audience: Array<{
    id: string;
    candidateSource: string;
    eligibilityState: string;
    inclusionState: string;
    eligibilityReasonCodes: string[];
    warningReasonCodes: string[];
    maskedLabel: string;
  }>;
  approvals: Array<{
    id: string;
    approvalType: string;
    approvedAt: string;
    isInvalidated: boolean;
    contentFingerprint: string | null;
    audienceFingerprint: string | null;
  }>;
  queue: Array<{
    id: string;
    status: string;
    blockReasonCodes: string[];
    preparedAt: string;
    exportedAt: string | null;
    handedOffAt: string | null;
    handedOffToLabel: string | null;
    deliveryEventCount: number;
  }>;
  contentPreview: {
    subject: string | null;
    bodySafe: string;
    mobilizeEventUrl: string | null;
    smsEstimate: { length: number; segments: number } | null;
  };
  providerCapabilities: ProviderCapabilityStatus[];
  notices: string[];
};

export type CommunicationListView = {
  items: CommunicationListItem[];
  notices: string[];
};

export type SuppressionListView = {
  items: Array<{
    id: string;
    reason: string;
    channel: string | null;
    allChannels: boolean;
    purpose: string | null;
    effectiveAt: string;
    contactPointId: string | null;
  }>;
  notices: string[];
};

export type PolicyView = {
  policy: {
    version: number;
    policyFingerprint: string;
    allowedChannels: string[];
    allowedPurposes: string[];
    allowOperatorAttestation: boolean;
    requireVerifiedContact: boolean;
    sharedContactMode: string;
    requireSeparateAudienceAndContentApproval: boolean;
    approvalExpiresHours: number | null;
    externalDispatchEnabled: boolean;
    exportEnabled: boolean;
    handoffEnabled: boolean;
  } | null;
  defaults: PolicyView["policy"];
  providerCapabilities: CommunicationDetail["providerCapabilities"];
  externalDispatchEnabled: boolean;
  notices: string[];
};

export type ProvidersDashboardView = {
  selectedProvider: string | null;
  noProviderSelected: boolean;
  registered: Array<{
    providerKey: string;
    isTestAdapter: boolean;
    selectable: boolean;
  }>;
  active: {
    providerKey: string;
    isTestAdapter: boolean;
    configuration: Record<string, unknown>;
    capabilities: Record<string, unknown>;
  };
  connections: Array<{
    providerKey: string;
    mode: string;
    configurationState: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    applicationDispatchEnabled: boolean;
    lastVerifiedAt: string | null;
  }>;
  controls: {
    globalKillSwitch: boolean;
    emailKillSwitch: boolean;
    smsKillSwitch: boolean;
    version: number;
    reason: string | null;
  };
  productionDispatchEnabled: boolean;
  notices: string[];
  isolation: Record<string, unknown>;
};

export type ProviderDetailView = {
  providerKey: string;
  isTestAdapter: boolean;
  configuration: Record<string, unknown>;
  connection: Record<string, unknown>;
  capabilities: Record<string, unknown>;
  sender: Record<string, unknown>;
  notices: string[];
};

export type DispatchHistoryView = {
  items: Array<{
    id: string;
    communicationId: string;
    title: string;
    channel: string;
    providerKey: string;
    status: string;
    acceptedCount: number;
    rejectedCount: number;
    unknownCount: number;
    blockedCount: number;
    createdAt: string;
  }>;
  notices: string[];
};

export type DispatchBatchDetailView = {
  id: string;
  communicationId: string;
  title: string;
  channel: string;
  providerKey: string;
  status: string;
  counts: {
    queue: number;
    accepted: number;
    rejected: number;
    unknown: number;
    blocked: number;
  };
  attempts: Array<{
    id: string;
    status: string;
    unknownOutcome: boolean;
    reconciliationState: string | null;
    errorCategory: string | null;
    hasProviderMessageId: boolean;
    startedAt: string;
    completedAt: string | null;
  }>;
  notices: string[];
};

export type DispatchPreflightView = {
  communicationId: string;
  title: string;
  channel: string;
  providerKey: string;
  providerMode: string;
  preparedCount: number;
  eligibleCount: number;
  blockedCount: number;
  sampleBlockingReasons: string[];
  approvals: {
    content: boolean;
    audience: boolean;
    dispatch: boolean;
  };
  policyVersion: number | null;
  killSwitches: {
    global: boolean;
    email: boolean;
    sms: boolean;
  };
  maxBatchSize: number;
  dispatchAvailable: boolean;
  exactDisabledReason: string;
  notices: string[];
  isolation: Record<string, unknown>;
};

export type DispatchControlsView = {
  globalKillSwitch: boolean;
  emailKillSwitch: boolean;
  smsKillSwitch: boolean;
  version: number;
  reason: string | null;
  changedAt: string;
  notices: string[];
};

export type WebhookHistoryView = {
  items: Array<{
    id: string;
    providerKey: string;
    processingStatus: string;
    signatureValid: boolean;
    normalizedEventCount: number | null;
    hasMatch: boolean;
    receivedAt: string;
    errorCategory: string | null;
  }>;
  notices: string[];
};
