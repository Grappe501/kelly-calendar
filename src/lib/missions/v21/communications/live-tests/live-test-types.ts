export const LIVE_TEST_CONSENT_SCOPE = "COMMUNICATIONS_CONTROLLED_LIVE_TEST";

export const AUTHORIZE_PHRASE = "AUTHORIZE ONE LIVE TEST";
export const LAUNCH_PHRASE = "SEND ONE CONTROLLED TEST";

export const D26_DEFAULT_LIMITS = {
  maximumRecipients: 1,
  maximumAttempts: 1,
  maximumProviderRequests: 1,
  manualLaunchOnly: true,
  retriesAllowed: false,
} as const;

export type LiveTestProviderState =
  | "DISABLED"
  | "SANDBOX_ONLY"
  | "LIVE_TEST_READY"
  | "PRODUCTION_READY_FUTURE"
  | "REVOKED";

export type LiveTestRevisionSnapshot = {
  channel: "EMAIL" | "SMS";
  providerKey: string;
  senderProfileKey: string | null;
  domainIdentityKey: string | null;
  compositionRevisionId: string | null;
  renderArtifactId: string | null;
  recipientAllowlistEntryId: string | null;
};

export type LiveTestReadinessInput = {
  revisionStatus: string;
  revisionHash: string;
  providerState: LiveTestProviderState;
  providerAuthVerified: boolean;
  senderVerified: boolean;
  domainVerified: boolean;
  dkimVerified: boolean;
  spfVerified: boolean;
  dmarcSurfaced: boolean;
  webhookSignatureVerified: boolean;
  webhookNormalizationVerified: boolean;
  approvedRecipientCount: number;
  recipientApproved: boolean;
  recipientExpired: boolean;
  recipientRevoked: boolean;
  consentValid: boolean;
  consentScopeOk: boolean;
  consentChannelOk: boolean;
  consentDestinationOk: boolean;
  suppressed: boolean;
  artifactPurposeDispatch: boolean;
  artifactApproved: boolean;
  artifactInvalidated: boolean;
  artifactChannelMatch: boolean;
  personalizationMatch: boolean;
  manualLaunchOnly: boolean;
  retriesAllowed: boolean;
  scheduledMode: boolean;
  audienceManifestUsed: boolean;
  emergencyStopActive: boolean;
  maximumRecipients: number;
  maximumAttempts: number;
  maximumProviderRequests: number;
};
