export type CampaignCommChannel =
  | "EMAIL"
  | "SMS"
  | "PHONE"
  | "IN_APP"
  | "MANUAL";

export type CampaignCommPurpose =
  | "MISSION_STAFFING"
  | "EVENT_REMINDER"
  | "OPERATIONAL_UPDATE"
  | "FOLLOW_UP"
  | "MOBILIZE_SIGNUP_LINK"
  | "MANUAL_OUTREACH"
  | "OTHER";

export type CampaignCommConsentEvidenceType =
  | "EXPLICIT_OPT_IN"
  | "CAMPAIGN_RELATIONSHIP"
  | "TRANSACTIONAL_CONTEXT"
  | "OPERATOR_ATTESTATION"
  | "PROVIDER_IMPORT"
  | "UNKNOWN";

export type CampaignCommEligibilityState =
  | "ELIGIBLE"
  | "INELIGIBLE"
  | "SUPPRESSED"
  | "AMBIGUOUS"
  | "MISSING_CONTACT"
  | "UNVERIFIED"
  | "REQUIRES_REVIEW";

export type CampaignCommunicationStatus =
  | "DRAFT"
  | "AUDIENCE_REVIEW"
  | "CONTENT_REVIEW"
  | "APPROVED"
  | "QUEUED"
  | "EXPORTED"
  | "HANDED_OFF"
  | "PARTIALLY_DISPATCHED"
  | "DISPATCHED"
  | "CANCELLED"
  | "STALE";

export type CampaignCommQueueStatus =
  | "PREPARED"
  | "BLOCKED"
  | "EXPORTED"
  | "HANDED_OFF"
  | "DISPATCH_ACCEPTED"
  | "DISPATCH_REJECTED"
  | "CANCELLED"
  | "UNKNOWN_OUTCOME";

export type CampaignCommInclusionState =
  | "CANDIDATE"
  | "INCLUDED"
  | "EXCLUDED"
  | "EXCEPTION_INCLUDED";

export type CampaignCommSuppressionReason =
  | "OPT_OUT"
  | "DO_NOT_CONTACT"
  | "INVALID_DESTINATION"
  | "BOUNCE"
  | "COMPLAINT"
  | "WRONG_PERSON"
  | "SHARED_CONTACT_RESTRICTED"
  | "PRIVACY_HOLD"
  | "MANUAL_POLICY"
  | "UNKNOWN";

export type CampaignCommContactVerification =
  | "UNVERIFIED"
  | "OPERATOR_VERIFIED"
  | "PROVIDER_VERIFIED"
  | "INVALID";

export type CommunicationPolicySnapshot = {
  version: number;
  policyFingerprint: string;
  allowedChannels: CampaignCommChannel[];
  allowedPurposes: CampaignCommPurpose[];
  /** Map key `${channel}|${purpose}` → accepted evidence types */
  acceptedEvidenceByChannelPurpose: Record<string, CampaignCommConsentEvidenceType[]>;
  allowOperatorAttestation: boolean;
  requireVerifiedContact: boolean;
  sharedContactMode: "ALLOW" | "REQUIRE_REVIEW" | "BLOCK";
  requireSeparateAudienceAndContentApproval: boolean;
  approvalExpiresHours: number | null;
  externalDispatchEnabled: boolean;
  exportEnabled: boolean;
  handoffEnabled: boolean;
};

export type ConsentEvidenceInput = {
  id: string;
  channel: CampaignCommChannel;
  purpose: CampaignCommPurpose;
  evidenceType: CampaignCommConsentEvidenceType;
  state: "ACTIVE" | "REVOKED" | "SUPERSEDED" | "EXPIRED";
  effectiveFrom: string;
  expiresAt: string | null;
};

export type SuppressionInput = {
  id: string;
  channel: CampaignCommChannel | null;
  allChannels: boolean;
  purpose: CampaignCommPurpose | null;
  reason: CampaignCommSuppressionReason;
  isActive: boolean;
  effectiveAt: string;
  expiresAt: string | null;
};

export type ContactPointInput = {
  id: string | null;
  channel: CampaignCommChannel;
  verificationState: CampaignCommContactVerification;
  maskedDisplay: string | null;
  identityAmbiguous?: boolean;
  sharedContactConflict?: boolean;
  externalMatchStatus?: string | null;
};

export type EligibilityEvaluationInput = {
  campaignScopeKey: string;
  channel: CampaignCommChannel;
  purpose: CampaignCommPurpose;
  nowIso: string;
  contact: ContactPointInput | null;
  evidence: ConsentEvidenceInput[];
  suppressions: SuppressionInput[];
  policy: CommunicationPolicySnapshot;
  /** Operational relevance sources — never treated as consent */
  candidateSources?: string[];
};

export type EligibilityResult = {
  state: CampaignCommEligibilityState;
  blockingReasonCodes: string[];
  warningReasonCodes: string[];
  evidenceIds: string[];
  suppressionIds: string[];
  policyVersion: number;
  policyFingerprint: string;
  fingerprint: string;
};

export type AudienceCandidateInput = {
  key: string;
  candidateSource: string;
  contact: ContactPointInput | null;
  localPersonId?: string | null;
  campaignUserId?: string | null;
  confirmedExternalPersonId?: string | null;
  manualDisplayLabel?: string | null;
  evidence: ConsentEvidenceInput[];
  suppressions: SuppressionInput[];
  externalMatchStatus?: string | null;
};

export const OPERATOR_NOTICE =
  "Communication eligibility depends on documented consent, campaign policy, the selected channel, and the intended purpose. Review the audience and suppression results before any external send.";

export const NO_INFERENCE_NOTICE =
  "Kelly Calendar does not infer consent from RSVP, attendance, staffing, check-in, or prior participation.";
