import { createHash } from "node:crypto";
import type {
  CampaignCommChannel,
  CampaignCommConsentEvidenceType,
  CampaignCommPurpose,
  CommunicationPolicySnapshot,
} from "@/lib/missions/v21/communications/types";

const DEFAULT_ACCEPTED: CampaignCommConsentEvidenceType[] = [
  "EXPLICIT_OPT_IN",
];

function channelPurposeKey(
  channel: CampaignCommChannel,
  purpose: CampaignCommPurpose,
) {
  return `${channel}|${purpose}`;
}

/** Conservative default — external dispatch off; attestation off. */
export function buildDefaultCommunicationPolicy(
  overrides: Partial<CommunicationPolicySnapshot> = {},
): CommunicationPolicySnapshot {
  const allowedChannels: CampaignCommChannel[] = [
    "EMAIL",
    "SMS",
    "MANUAL",
    "IN_APP",
  ];
  const allowedPurposes: CampaignCommPurpose[] = [
    "MISSION_STAFFING",
    "EVENT_REMINDER",
    "OPERATIONAL_UPDATE",
    "FOLLOW_UP",
    "MOBILIZE_SIGNUP_LINK",
    "MANUAL_OUTREACH",
    "OTHER",
  ];
  const acceptedEvidenceByChannelPurpose: Record<
    string,
    CampaignCommConsentEvidenceType[]
  > = {};
  for (const channel of allowedChannels) {
    for (const purpose of allowedPurposes) {
      acceptedEvidenceByChannelPurpose[channelPurposeKey(channel, purpose)] = [
        ...DEFAULT_ACCEPTED,
      ];
    }
  }
  const base: CommunicationPolicySnapshot = {
    version: 1,
    policyFingerprint: "",
    allowedChannels,
    allowedPurposes,
    acceptedEvidenceByChannelPurpose,
    allowOperatorAttestation: false,
    requireVerifiedContact: true,
    sharedContactMode: "REQUIRE_REVIEW",
    requireSeparateAudienceAndContentApproval: true,
    approvalExpiresHours: 72,
    externalDispatchEnabled: false,
    exportEnabled: true,
    handoffEnabled: true,
    ...overrides,
  };
  return {
    ...base,
    policyFingerprint:
      overrides.policyFingerprint || fingerprintPolicy(base),
  };
}

export function fingerprintPolicy(
  policy: Omit<CommunicationPolicySnapshot, "policyFingerprint"> & {
    policyFingerprint?: string;
  },
): string {
  const payload = {
    version: policy.version,
    allowedChannels: [...policy.allowedChannels].sort(),
    allowedPurposes: [...policy.allowedPurposes].sort(),
    acceptedEvidenceByChannelPurpose: policy.acceptedEvidenceByChannelPurpose,
    allowOperatorAttestation: policy.allowOperatorAttestation,
    requireVerifiedContact: policy.requireVerifiedContact,
    sharedContactMode: policy.sharedContactMode,
    requireSeparateAudienceAndContentApproval:
      policy.requireSeparateAudienceAndContentApproval,
    approvalExpiresHours: policy.approvalExpiresHours,
    externalDispatchEnabled: policy.externalDispatchEnabled,
    exportEnabled: policy.exportEnabled,
    handoffEnabled: policy.handoffEnabled,
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

export function acceptedEvidenceTypes(
  policy: CommunicationPolicySnapshot,
  channel: CampaignCommChannel,
  purpose: CampaignCommPurpose,
): CampaignCommConsentEvidenceType[] {
  return (
    policy.acceptedEvidenceByChannelPurpose[channelPurposeKey(channel, purpose)] ??
    []
  );
}
