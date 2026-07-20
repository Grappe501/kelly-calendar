import {
  OPERATOR_NOTICE,
  NO_INFERENCE_NOTICE,
} from "@/lib/missions/v21/communications";
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
