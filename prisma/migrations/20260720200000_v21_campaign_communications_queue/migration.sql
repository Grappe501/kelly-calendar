-- V2.1 Campaign Communications and Mobilization Queue (D20)
-- Additive. Lazy-create communications only via intentional writes.
-- External provider send disabled in D20.
-- Owned schema: kelly_calendar

CREATE TYPE "kelly_calendar"."CampaignCommChannel" AS ENUM (
  'EMAIL', 'SMS', 'PHONE', 'IN_APP', 'MANUAL'
);

CREATE TYPE "kelly_calendar"."CampaignCommContactVerification" AS ENUM (
  'UNVERIFIED', 'OPERATOR_VERIFIED', 'PROVIDER_VERIFIED', 'INVALID'
);

CREATE TYPE "kelly_calendar"."CampaignCommConsentEvidenceType" AS ENUM (
  'EXPLICIT_OPT_IN', 'CAMPAIGN_RELATIONSHIP', 'TRANSACTIONAL_CONTEXT',
  'OPERATOR_ATTESTATION', 'PROVIDER_IMPORT', 'UNKNOWN'
);

CREATE TYPE "kelly_calendar"."CampaignCommConsentState" AS ENUM (
  'ACTIVE', 'REVOKED', 'SUPERSEDED', 'EXPIRED'
);

CREATE TYPE "kelly_calendar"."CampaignCommSuppressionReason" AS ENUM (
  'OPT_OUT', 'DO_NOT_CONTACT', 'INVALID_DESTINATION', 'BOUNCE', 'COMPLAINT',
  'WRONG_PERSON', 'SHARED_CONTACT_RESTRICTED', 'PRIVACY_HOLD', 'MANUAL_POLICY', 'UNKNOWN'
);

CREATE TYPE "kelly_calendar"."CampaignCommunicationStatus" AS ENUM (
  'DRAFT', 'AUDIENCE_REVIEW', 'CONTENT_REVIEW', 'APPROVED', 'QUEUED',
  'EXPORTED', 'HANDED_OFF', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'CANCELLED', 'STALE'
);

CREATE TYPE "kelly_calendar"."CampaignCommPurpose" AS ENUM (
  'MISSION_STAFFING', 'EVENT_REMINDER', 'OPERATIONAL_UPDATE', 'FOLLOW_UP',
  'MOBILIZE_SIGNUP_LINK', 'MANUAL_OUTREACH', 'OTHER'
);

CREATE TYPE "kelly_calendar"."CampaignCommEligibilityState" AS ENUM (
  'ELIGIBLE', 'INELIGIBLE', 'SUPPRESSED', 'AMBIGUOUS', 'MISSING_CONTACT',
  'UNVERIFIED', 'REQUIRES_REVIEW'
);

CREATE TYPE "kelly_calendar"."CampaignCommInclusionState" AS ENUM (
  'CANDIDATE', 'INCLUDED', 'EXCLUDED', 'EXCEPTION_INCLUDED'
);

CREATE TYPE "kelly_calendar"."CampaignCommApprovalType" AS ENUM (
  'CONTENT', 'AUDIENCE', 'DISPATCH'
);

CREATE TYPE "kelly_calendar"."CampaignCommQueueStatus" AS ENUM (
  'PREPARED', 'BLOCKED', 'EXPORTED', 'HANDED_OFF', 'DISPATCH_ACCEPTED',
  'DISPATCH_REJECTED', 'CANCELLED', 'UNKNOWN_OUTCOME'
);

CREATE TYPE "kelly_calendar"."CampaignCommDeliveryEventType" AS ENUM (
  'DISPATCH_ACCEPTED', 'DISPATCH_REJECTED', 'DELIVERED', 'BOUNCED', 'FAILED',
  'UNSUBSCRIBED', 'COMPLAINT', 'REPLIED', 'CLICKED'
);

CREATE TYPE "kelly_calendar"."CampaignCommDeliverySource" AS ENUM (
  'PROVIDER', 'MANUAL_OPERATOR', 'IMPORT', 'SYSTEM'
);

CREATE TABLE "kelly_calendar"."CampaignCommunicationPolicy" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "version" INTEGER NOT NULL DEFAULT 1,
  "policyFingerprint" TEXT NOT NULL,
  "allowedChannels" TEXT[] NOT NULL,
  "allowedPurposes" TEXT[] NOT NULL,
  "acceptedEvidenceByChannelPurpose" JSONB NOT NULL DEFAULT '{}',
  "allowOperatorAttestation" BOOLEAN NOT NULL DEFAULT false,
  "requireVerifiedContact" BOOLEAN NOT NULL DEFAULT true,
  "sharedContactMode" TEXT NOT NULL DEFAULT 'REQUIRE_REVIEW',
  "requireSeparateAudienceAndContentApproval" BOOLEAN NOT NULL DEFAULT true,
  "approvalExpiresHours" INTEGER,
  "externalDispatchEnabled" BOOLEAN NOT NULL DEFAULT false,
  "exportEnabled" BOOLEAN NOT NULL DEFAULT true,
  "handoffEnabled" BOOLEAN NOT NULL DEFAULT true,
  "retentionDays" INTEGER,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignCommunicationPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignCommunicationPolicy_campaignScopeKey_version_key"
  ON "kelly_calendar"."CampaignCommunicationPolicy"("campaignScopeKey", "version");
CREATE INDEX "CampaignCommunicationPolicy_campaignScopeKey_isActive_idx"
  ON "kelly_calendar"."CampaignCommunicationPolicy"("campaignScopeKey", "isActive");

CREATE TABLE "kelly_calendar"."CampaignContactPoint" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "localPersonId" TEXT,
  "campaignUserId" TEXT,
  "confirmedExternalPersonId" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "normalizedDestination" TEXT NOT NULL,
  "maskedDisplay" TEXT NOT NULL,
  "verificationState" "kelly_calendar"."CampaignCommContactVerification" NOT NULL DEFAULT 'UNVERIFIED',
  "provenance" TEXT NOT NULL DEFAULT 'OPERATOR',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "firstObservedAt" TIMESTAMP(3),
  "lastObservedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignContactPoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignContactPoint_scope_channel_dest_key"
  ON "kelly_calendar"."CampaignContactPoint"("campaignScopeKey", "channel", "normalizedDestination");
CREATE INDEX "CampaignContactPoint_localPersonId_idx"
  ON "kelly_calendar"."CampaignContactPoint"("localPersonId");
CREATE INDEX "CampaignContactPoint_campaignUserId_idx"
  ON "kelly_calendar"."CampaignContactPoint"("campaignUserId");
CREATE INDEX "CampaignContactPoint_confirmedExternalPersonId_idx"
  ON "kelly_calendar"."CampaignContactPoint"("confirmedExternalPersonId");

CREATE TABLE "kelly_calendar"."CampaignCommunicationConsentEvidence" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "contactPointId" TEXT NOT NULL,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "purpose" "kelly_calendar"."CampaignCommPurpose" NOT NULL,
  "evidenceType" "kelly_calendar"."CampaignCommConsentEvidenceType" NOT NULL,
  "source" TEXT NOT NULL,
  "sourceReference" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "scopeNote" TEXT,
  "evidenceNote" TEXT,
  "state" "kelly_calendar"."CampaignCommConsentState" NOT NULL DEFAULT 'ACTIVE',
  "recordedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignCommunicationConsentEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignCommunicationConsentEvidence_contactPointId_idx"
  ON "kelly_calendar"."CampaignCommunicationConsentEvidence"("contactPointId");
CREATE INDEX "CampaignCommunicationConsentEvidence_channel_purpose_state_idx"
  ON "kelly_calendar"."CampaignCommunicationConsentEvidence"("channel", "purpose", "state");
CREATE INDEX "CampaignCommunicationConsentEvidence_campaignScopeKey_idx"
  ON "kelly_calendar"."CampaignCommunicationConsentEvidence"("campaignScopeKey");

ALTER TABLE "kelly_calendar"."CampaignCommunicationConsentEvidence"
  ADD CONSTRAINT "CampaignCommunicationConsentEvidence_contactPointId_fkey"
  FOREIGN KEY ("contactPointId") REFERENCES "kelly_calendar"."CampaignContactPoint"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CampaignCommunicationSuppression" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "contactPointId" TEXT,
  "localPersonId" TEXT,
  "campaignUserId" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel",
  "allChannels" BOOLEAN NOT NULL DEFAULT false,
  "purpose" "kelly_calendar"."CampaignCommPurpose",
  "reason" "kelly_calendar"."CampaignCommSuppressionReason" NOT NULL,
  "source" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "recordedByUserId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignCommunicationSuppression_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignCommunicationSuppression_contactPointId_idx"
  ON "kelly_calendar"."CampaignCommunicationSuppression"("contactPointId");
CREATE INDEX "CampaignCommunicationSuppression_campaignScopeKey_isActive_idx"
  ON "kelly_calendar"."CampaignCommunicationSuppression"("campaignScopeKey", "isActive");
CREATE INDEX "CampaignCommunicationSuppression_localPersonId_idx"
  ON "kelly_calendar"."CampaignCommunicationSuppression"("localPersonId");

ALTER TABLE "kelly_calendar"."CampaignCommunicationSuppression"
  ADD CONSTRAINT "CampaignCommunicationSuppression_contactPointId_fkey"
  FOREIGN KEY ("contactPointId") REFERENCES "kelly_calendar"."CampaignContactPoint"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CampaignCommunication" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "missionId" TEXT,
  "eventId" TEXT,
  "staffingPlanId" TEXT,
  "staffingRequirementId" TEXT,
  "campaignDateKey" TEXT,
  "purpose" "kelly_calendar"."CampaignCommPurpose" NOT NULL,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "title" TEXT NOT NULL,
  "subject" TEXT,
  "bodyText" TEXT,
  "bodyHtml" TEXT,
  "mobilizeEventUrl" TEXT,
  "mobilizeEventReferenceId" TEXT,
  "status" "kelly_calendar"."CampaignCommunicationStatus" NOT NULL DEFAULT 'DRAFT',
  "contentFingerprint" TEXT,
  "audienceFingerprint" TEXT,
  "policyVersion" INTEGER,
  "policyFingerprint" TEXT,
  "isStale" BOOLEAN NOT NULL DEFAULT false,
  "staleReason" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "cancelledByUserId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignCommunication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignCommunication_campaignScopeKey_status_idx"
  ON "kelly_calendar"."CampaignCommunication"("campaignScopeKey", "status");
CREATE INDEX "CampaignCommunication_missionId_idx"
  ON "kelly_calendar"."CampaignCommunication"("missionId");
CREATE INDEX "CampaignCommunication_eventId_idx"
  ON "kelly_calendar"."CampaignCommunication"("eventId");
CREATE INDEX "CampaignCommunication_campaignDateKey_idx"
  ON "kelly_calendar"."CampaignCommunication"("campaignDateKey");

ALTER TABLE "kelly_calendar"."CampaignCommunication"
  ADD CONSTRAINT "CampaignCommunication_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CampaignCommunicationAudienceMember" (
  "id" TEXT NOT NULL,
  "communicationId" TEXT NOT NULL,
  "contactPointId" TEXT,
  "localPersonId" TEXT,
  "campaignUserId" TEXT,
  "confirmedExternalPersonId" TEXT,
  "manualDisplayLabel" TEXT,
  "candidateSource" TEXT NOT NULL,
  "eligibilityState" "kelly_calendar"."CampaignCommEligibilityState" NOT NULL,
  "inclusionState" "kelly_calendar"."CampaignCommInclusionState" NOT NULL DEFAULT 'CANDIDATE',
  "eligibilityReasonCodes" TEXT[] NOT NULL,
  "warningReasonCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "consentEvidenceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "suppressionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "eligibilityFingerprint" TEXT NOT NULL,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "inclusionActorUserId" TEXT,
  "inclusionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignCommunicationAudienceMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignCommunicationAudienceMember_communicationId_idx"
  ON "kelly_calendar"."CampaignCommunicationAudienceMember"("communicationId");
CREATE INDEX "CampaignCommunicationAudienceMember_eligibilityState_idx"
  ON "kelly_calendar"."CampaignCommunicationAudienceMember"("eligibilityState");
CREATE INDEX "CampaignCommunicationAudienceMember_contactPointId_idx"
  ON "kelly_calendar"."CampaignCommunicationAudienceMember"("contactPointId");

ALTER TABLE "kelly_calendar"."CampaignCommunicationAudienceMember"
  ADD CONSTRAINT "CampaignCommunicationAudienceMember_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "kelly_calendar"."CampaignCommunication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignCommunicationAudienceMember"
  ADD CONSTRAINT "CampaignCommunicationAudienceMember_contactPointId_fkey"
  FOREIGN KEY ("contactPointId") REFERENCES "kelly_calendar"."CampaignContactPoint"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CampaignCommunicationApproval" (
  "id" TEXT NOT NULL,
  "communicationId" TEXT NOT NULL,
  "approvalType" "kelly_calendar"."CampaignCommApprovalType" NOT NULL,
  "contentFingerprint" TEXT,
  "audienceFingerprint" TEXT,
  "policyVersion" INTEGER,
  "policyFingerprint" TEXT,
  "approvedByUserId" TEXT NOT NULL,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "isConsumed" BOOLEAN NOT NULL DEFAULT false,
  "isInvalidated" BOOLEAN NOT NULL DEFAULT false,
  "invalidatedAt" TIMESTAMP(3),
  "invalidationReason" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignCommunicationApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignCommunicationApproval_communicationId_type_idx"
  ON "kelly_calendar"."CampaignCommunicationApproval"("communicationId", "approvalType");

ALTER TABLE "kelly_calendar"."CampaignCommunicationApproval"
  ADD CONSTRAINT "CampaignCommunicationApproval_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "kelly_calendar"."CampaignCommunication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CampaignCommunicationQueueItem" (
  "id" TEXT NOT NULL,
  "communicationId" TEXT NOT NULL,
  "audienceMemberId" TEXT NOT NULL,
  "contactPointId" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "destinationRef" TEXT,
  "status" "kelly_calendar"."CampaignCommQueueStatus" NOT NULL DEFAULT 'PREPARED',
  "contentFingerprint" TEXT NOT NULL,
  "audienceFingerprint" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "preparedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "exportedAt" TIMESTAMP(3),
  "handedOffAt" TIMESTAMP(3),
  "handedOffToLabel" TEXT,
  "provider" TEXT,
  "externalDispatchId" TEXT,
  "lastErrorClass" TEXT,
  "blockReasonCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignCommunicationQueueItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignCommunicationQueueItem_idempotencyKey_key"
  ON "kelly_calendar"."CampaignCommunicationQueueItem"("idempotencyKey");
CREATE INDEX "CampaignCommunicationQueueItem_communicationId_status_idx"
  ON "kelly_calendar"."CampaignCommunicationQueueItem"("communicationId", "status");
CREATE INDEX "CampaignCommunicationQueueItem_audienceMemberId_idx"
  ON "kelly_calendar"."CampaignCommunicationQueueItem"("audienceMemberId");

ALTER TABLE "kelly_calendar"."CampaignCommunicationQueueItem"
  ADD CONSTRAINT "CampaignCommunicationQueueItem_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "kelly_calendar"."CampaignCommunication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CampaignCommunicationQueueItem"
  ADD CONSTRAINT "CampaignCommunicationQueueItem_audienceMemberId_fkey"
  FOREIGN KEY ("audienceMemberId") REFERENCES "kelly_calendar"."CampaignCommunicationAudienceMember"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CampaignCommunicationDeliveryEvent" (
  "id" TEXT NOT NULL,
  "queueItemId" TEXT NOT NULL,
  "eventType" "kelly_calendar"."CampaignCommDeliveryEventType" NOT NULL,
  "source" "kelly_calendar"."CampaignCommDeliverySource" NOT NULL,
  "providerEventId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "provenance" TEXT NOT NULL,
  "redactedDiagnostics" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignCommunicationDeliveryEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignCommunicationDeliveryEvent_queueItemId_idx"
  ON "kelly_calendar"."CampaignCommunicationDeliveryEvent"("queueItemId");
CREATE UNIQUE INDEX "CampaignCommunicationDeliveryEvent_providerEventId_key"
  ON "kelly_calendar"."CampaignCommunicationDeliveryEvent"("providerEventId");

ALTER TABLE "kelly_calendar"."CampaignCommunicationDeliveryEvent"
  ADD CONSTRAINT "CampaignCommunicationDeliveryEvent_queueItemId_fkey"
  FOREIGN KEY ("queueItemId") REFERENCES "kelly_calendar"."CampaignCommunicationQueueItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
