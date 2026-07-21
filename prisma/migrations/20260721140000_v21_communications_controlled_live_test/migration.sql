-- D26 Controlled Live-Test Authorization & Deliverability Readiness
-- Authorizes a specific one-time test — not general production dispatch.

CREATE TYPE "kelly_calendar"."CommLiveTestProgramStatus" AS ENUM (
  'DRAFT','CONFIGURING','READINESS_REVIEW','READY_FOR_AUTHORIZATION','AUTHORIZED',
  'IN_PROGRESS','COMPLETED','COMPLETED_WITH_WARNINGS','FAILED','CANCELLED','EXPIRED','ARCHIVED'
);
CREATE TYPE "kelly_calendar"."CommLiveTestRevisionStatus" AS ENUM (
  'DRAFT','IN_REVIEW','APPROVED','SUPERSEDED','REJECTED'
);
CREATE TYPE "kelly_calendar"."CommLiveTestCheckType" AS ENUM (
  'PROVIDER_AUTHENTICATION','PROVIDER_PRODUCTION_CAPABILITY','SENDER_IDENTITY','SENDING_DOMAIN',
  'SPF','DKIM','DMARC','RETURN_PATH','REPLY_TO','WEBHOOK_ENDPOINT','WEBHOOK_SIGNATURE',
  'WEBHOOK_EVENT_NORMALIZATION','SUPPRESSION_SYNC','PROVIDER_HEALTH','RATE_LIMIT_VISIBILITY',
  'CREDENTIAL_SCOPE','CREDENTIAL_ROTATION','EMERGENCY_STOP'
);
CREATE TYPE "kelly_calendar"."CommLiveTestCheckStatus" AS ENUM (
  'NOT_CHECKED','PENDING','VERIFIED','WARNING','BLOCKED','EXPIRED','REVOKED'
);
CREATE TYPE "kelly_calendar"."CommLiveTestProviderState" AS ENUM (
  'DISABLED','SANDBOX_ONLY','LIVE_TEST_READY','PRODUCTION_READY_FUTURE','REVOKED'
);
CREATE TYPE "kelly_calendar"."CommLiveTestRecipientStatus" AS ENUM (
  'DRAFT','PENDING_VERIFICATION','VERIFIED','APPROVED','REVOKED','EXPIRED'
);
CREATE TYPE "kelly_calendar"."CommLiveTestOwnershipMethod" AS ENUM (
  'OPERATOR_ATTESTATION','CONFIRMATION_LINK','ONE_TIME_CODE','SIGNED_CONSENT_RECORD','CAMPAIGN_CONTROLLED_DESTINATION'
);
CREATE TYPE "kelly_calendar"."CommLiveTestReadinessStatus" AS ENUM (
  'NOT_STARTED','IN_PROGRESS','BLOCKED','READY','APPROVED','REVOKED','EXPIRED'
);
CREATE TYPE "kelly_calendar"."CommLiveTestAuthStatus" AS ENUM (
  'DRAFT','AUTHORIZED','CONSUMED','REVOKED','EXPIRED','FAILED_CLOSED'
);
CREATE TYPE "kelly_calendar"."CommLiveTestExecutionStatus" AS ENUM (
  'READY','PREFLIGHT_BLOCKED','SUBMITTING','SUBMITTED','ACCEPTED','DELIVERED','FAILED',
  'UNKNOWN','CANCELLED_BEFORE_SUBMISSION','COMPLETED_WITH_WARNINGS'
);
CREATE TYPE "kelly_calendar"."CommLiveTestEvidenceFinalState" AS ENUM (
  'DELIVERED','FAILED','BOUNCED','COMPLAINT','SUPPRESSED','UNKNOWN','PARTIAL_EVIDENCE'
);
CREATE TYPE "kelly_calendar"."CommLiveTestPostReviewStatus" AS ENUM (
  'NOT_STARTED','IN_PROGRESS','COMPLETED','COMPLETED_WITH_WARNINGS','BLOCKED'
);
CREATE TYPE "kelly_calendar"."CommLiveTestIncidentSeverity" AS ENUM (
  'INFO','WARNING','HIGH','CRITICAL'
);
CREATE TYPE "kelly_calendar"."CommLiveTestIncidentStatus" AS ENUM (
  'OPEN','CONTAINED','RESOLVED','FALSE_ALARM'
);
CREATE TYPE "kelly_calendar"."CommLiveTestConfirmStatus" AS ENUM (
  'NOT_REQUESTED','PENDING','CONFIRMED','NOT_RECEIVED','UNCERTAIN'
);

CREATE TABLE "kelly_calendar"."CommunicationLiveTestProgram" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "programKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "providerKey" TEXT NOT NULL DEFAULT 'kccc-sandbox',
  "providerState" "kelly_calendar"."CommLiveTestProviderState" NOT NULL DEFAULT 'SANDBOX_ONLY',
  "status" "kelly_calendar"."CommLiveTestProgramStatus" NOT NULL DEFAULT 'DRAFT',
  "purpose" TEXT,
  "ownerUserId" TEXT,
  "createdByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationLiveTestProgram_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunicationLiveTestProgram_scope_key"
  ON "kelly_calendar"."CommunicationLiveTestProgram"("campaignScopeKey", "programKey");
CREATE INDEX "CommunicationLiveTestProgram_status_idx"
  ON "kelly_calendar"."CommunicationLiveTestProgram"("status");

CREATE TABLE "kelly_calendar"."CommunicationLiveTestRevision" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "status" "kelly_calendar"."CommLiveTestRevisionStatus" NOT NULL DEFAULT 'DRAFT',
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "providerKey" TEXT NOT NULL,
  "providerConnectionId" TEXT,
  "senderProfileKey" TEXT,
  "domainIdentityKey" TEXT,
  "compositionId" TEXT,
  "compositionRevisionId" TEXT,
  "renderArtifactId" TEXT,
  "recipientAllowlistEntryId" TEXT,
  "configurationSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "contentHash" TEXT NOT NULL,
  "changeSummary" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "supersededAt" TIMESTAMP(3),
  CONSTRAINT "CommunicationLiveTestRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLiveTestRevision_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "kelly_calendar"."CommunicationLiveTestProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationLiveTestRevision_program_version"
  ON "kelly_calendar"."CommunicationLiveTestRevision"("programId", "revisionNumber");

CREATE TABLE "kelly_calendar"."CommunicationProductionReadinessCheck" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "programRevisionId" TEXT,
  "checkType" "kelly_calendar"."CommLiveTestCheckType" NOT NULL,
  "status" "kelly_calendar"."CommLiveTestCheckStatus" NOT NULL DEFAULT 'NOT_CHECKED',
  "providerKey" TEXT,
  "subjectKey" TEXT,
  "evidenceJson" JSONB NOT NULL DEFAULT '{}',
  "evidenceHash" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "verifiedByUserId" TEXT,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationProductionReadinessCheck_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationProductionReadinessCheck_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "kelly_calendar"."CommunicationLiveTestProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationProductionReadinessCheck_programId_idx"
  ON "kelly_calendar"."CommunicationProductionReadinessCheck"("programId");

CREATE TABLE "kelly_calendar"."CommunicationLiveTestRecipient" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "localPersonId" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "contactPointId" TEXT,
  "destinationFingerprint" TEXT NOT NULL,
  "destinationMasked" TEXT NOT NULL,
  "status" "kelly_calendar"."CommLiveTestRecipientStatus" NOT NULL DEFAULT 'DRAFT',
  "relationshipToCampaign" TEXT,
  "consentEvidenceId" TEXT,
  "consentScope" TEXT NOT NULL DEFAULT 'COMMUNICATIONS_CONTROLLED_LIVE_TEST',
  "ownershipVerifiedAt" TIMESTAMP(3),
  "ownershipVerificationMethod" "kelly_calendar"."CommLiveTestOwnershipMethod",
  "ownershipAttestationJson" JSONB NOT NULL DEFAULT '{}',
  "addedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  CONSTRAINT "CommunicationLiveTestRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLiveTestRecipient_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "kelly_calendar"."CommunicationLiveTestProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationLiveTestRecipient_programId_idx"
  ON "kelly_calendar"."CommunicationLiveTestRecipient"("programId");
CREATE INDEX "CommunicationLiveTestRecipient_destinationFingerprint_idx"
  ON "kelly_calendar"."CommunicationLiveTestRecipient"("destinationFingerprint");

CREATE TABLE "kelly_calendar"."CommunicationLiveTestReadinessReview" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "programRevisionId" TEXT NOT NULL,
  "status" "kelly_calendar"."CommLiveTestReadinessStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "providerChecksJson" JSONB NOT NULL DEFAULT '{}',
  "senderChecksJson" JSONB NOT NULL DEFAULT '{}',
  "domainChecksJson" JSONB NOT NULL DEFAULT '{}',
  "webhookChecksJson" JSONB NOT NULL DEFAULT '{}',
  "recipientChecksJson" JSONB NOT NULL DEFAULT '{}',
  "consentChecksJson" JSONB NOT NULL DEFAULT '{}',
  "artifactChecksJson" JSONB NOT NULL DEFAULT '{}',
  "dispatchChecksJson" JSONB NOT NULL DEFAULT '{}',
  "securityChecksJson" JSONB NOT NULL DEFAULT '{}',
  "operatorChecklistJson" JSONB NOT NULL DEFAULT '{}',
  "blockingIssuesJson" JSONB NOT NULL DEFAULT '[]',
  "warningsJson" JSONB NOT NULL DEFAULT '[]',
  "readinessHash" TEXT NOT NULL,
  "reviewedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "CommunicationLiveTestReadinessReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLiveTestReadinessReview_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "kelly_calendar"."CommunicationLiveTestProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationLiveTestReadinessReview_programRevisionId_fkey"
    FOREIGN KEY ("programRevisionId") REFERENCES "kelly_calendar"."CommunicationLiveTestRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationLiveTestReadinessReview_programId_idx"
  ON "kelly_calendar"."CommunicationLiveTestReadinessReview"("programId");

CREATE TABLE "kelly_calendar"."CommunicationLiveTestAuthorization" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "programRevisionId" TEXT NOT NULL,
  "readinessReviewId" TEXT NOT NULL,
  "status" "kelly_calendar"."CommLiveTestAuthStatus" NOT NULL DEFAULT 'DRAFT',
  "providerKey" TEXT NOT NULL,
  "providerConnectionId" TEXT,
  "senderProfileKey" TEXT,
  "renderArtifactId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "destinationFingerprint" TEXT NOT NULL,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "maximumRecipients" INTEGER NOT NULL DEFAULT 1,
  "maximumAttempts" INTEGER NOT NULL DEFAULT 1,
  "maximumProviderRequests" INTEGER NOT NULL DEFAULT 1,
  "manualLaunchOnly" BOOLEAN NOT NULL DEFAULT true,
  "retriesAllowed" BOOLEAN NOT NULL DEFAULT false,
  "authorizedStartAt" TIMESTAMP(3),
  "authorizedEndAt" TIMESTAMP(3),
  "authorizationHash" TEXT NOT NULL,
  "authorizationPhraseHash" TEXT,
  "authorizedByUserId" TEXT,
  "authorizationNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedAt" TIMESTAMP(3),
  "consumedByAttemptId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "revocationReason" TEXT,
  CONSTRAINT "CommunicationLiveTestAuthorization_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLiveTestAuthorization_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "kelly_calendar"."CommunicationLiveTestProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationLiveTestAuthorization_programRevisionId_fkey"
    FOREIGN KEY ("programRevisionId") REFERENCES "kelly_calendar"."CommunicationLiveTestRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationLiveTestAuthorization_readinessReviewId_fkey"
    FOREIGN KEY ("readinessReviewId") REFERENCES "kelly_calendar"."CommunicationLiveTestReadinessReview"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationLiveTestAuthorization_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "kelly_calendar"."CommunicationLiveTestRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationLiveTestAuthorization_programId_idx"
  ON "kelly_calendar"."CommunicationLiveTestAuthorization"("programId");
CREATE INDEX "CommunicationLiveTestAuthorization_status_idx"
  ON "kelly_calendar"."CommunicationLiveTestAuthorization"("status");

CREATE TABLE "kelly_calendar"."CommunicationLiveTestExecution" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "programRevisionId" TEXT NOT NULL,
  "authorizationId" TEXT NOT NULL,
  "status" "kelly_calendar"."CommLiveTestExecutionStatus" NOT NULL DEFAULT 'READY',
  "attemptId" TEXT,
  "providerKey" TEXT NOT NULL,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "recipientId" TEXT NOT NULL,
  "destinationFingerprint" TEXT NOT NULL,
  "renderArtifactId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "providerSubmittedAt" TIMESTAMP(3),
  "providerAcceptedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "providerRequestFingerprint" TEXT,
  "providerMessageReference" TEXT,
  "preflightSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "providerResponseSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "reconciliationSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "failureReason" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationLiveTestExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLiveTestExecution_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "kelly_calendar"."CommunicationLiveTestProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationLiveTestExecution_authorizationId_fkey"
    FOREIGN KEY ("authorizationId") REFERENCES "kelly_calendar"."CommunicationLiveTestAuthorization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationLiveTestExecution_programId_idx"
  ON "kelly_calendar"."CommunicationLiveTestExecution"("programId");

CREATE TABLE "kelly_calendar"."CommunicationPostTestSafetyVerification" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "productionDispatchFlagBlocked" BOOLEAN NOT NULL DEFAULT true,
  "productionCampaignModeBlocked" BOOLEAN NOT NULL DEFAULT true,
  "authorizationConsumed" BOOLEAN NOT NULL DEFAULT false,
  "scheduledIngressBlocked" BOOLEAN NOT NULL DEFAULT true,
  "audienceDispatchBlocked" BOOLEAN NOT NULL DEFAULT true,
  "killSwitchesActive" BOOLEAN NOT NULL DEFAULT true,
  "verificationSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedByUserId" TEXT,
  "evidenceHash" TEXT NOT NULL,
  "failedClosed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CommunicationPostTestSafetyVerification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationPostTestSafetyVerification_executionId_fkey"
    FOREIGN KEY ("executionId") REFERENCES "kelly_calendar"."CommunicationLiveTestExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationPostTestSafetyVerification_execution"
  ON "kelly_calendar"."CommunicationPostTestSafetyVerification"("executionId");

CREATE TABLE "kelly_calendar"."CommunicationLiveTestEvidence" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "providerAuthenticationVerified" BOOLEAN NOT NULL DEFAULT false,
  "senderIdentityVerified" BOOLEAN NOT NULL DEFAULT false,
  "domainVerified" BOOLEAN NOT NULL DEFAULT false,
  "spfStatus" TEXT,
  "dkimStatus" TEXT,
  "dmarcStatus" TEXT,
  "webhookSignatureVerified" BOOLEAN NOT NULL DEFAULT false,
  "providerSubmissionObserved" BOOLEAN NOT NULL DEFAULT false,
  "providerAcceptanceObserved" BOOLEAN NOT NULL DEFAULT false,
  "deliveryObserved" BOOLEAN NOT NULL DEFAULT false,
  "bounceObserved" BOOLEAN NOT NULL DEFAULT false,
  "complaintObserved" BOOLEAN NOT NULL DEFAULT false,
  "suppressionObserved" BOOLEAN NOT NULL DEFAULT false,
  "unsubscribeObserved" BOOLEAN NOT NULL DEFAULT false,
  "finalState" "kelly_calendar"."CommLiveTestEvidenceFinalState" NOT NULL DEFAULT 'UNKNOWN',
  "recipientConfirmationStatus" "kelly_calendar"."CommLiveTestConfirmStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
  "recipientConfirmedAt" TIMESTAMP(3),
  "recipientConfirmationMethod" TEXT,
  "recipientConfirmedByUserId" TEXT,
  "evidenceSummaryJson" JSONB NOT NULL DEFAULT '{}',
  "evidenceHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finalizedAt" TIMESTAMP(3),
  "finalizedByUserId" TEXT,
  CONSTRAINT "CommunicationLiveTestEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLiveTestEvidence_executionId_fkey"
    FOREIGN KEY ("executionId") REFERENCES "kelly_calendar"."CommunicationLiveTestExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationLiveTestEvidence_execution"
  ON "kelly_calendar"."CommunicationLiveTestEvidence"("executionId");

CREATE TABLE "kelly_calendar"."CommunicationLiveTestPostReview" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "status" "kelly_calendar"."CommLiveTestPostReviewStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "providerReviewJson" JSONB NOT NULL DEFAULT '{}',
  "deliverabilityReviewJson" JSONB NOT NULL DEFAULT '{}',
  "webhookReviewJson" JSONB NOT NULL DEFAULT '{}',
  "suppressionReviewJson" JSONB NOT NULL DEFAULT '{}',
  "securityReviewJson" JSONB NOT NULL DEFAULT '{}',
  "productionBlockReviewJson" JSONB NOT NULL DEFAULT '{}',
  "incidentSummaryJson" JSONB NOT NULL DEFAULT '{}',
  "lessonsLearned" TEXT,
  "recommendedNextStep" TEXT,
  "reviewedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "evidenceHash" TEXT NOT NULL,
  CONSTRAINT "CommunicationLiveTestPostReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLiveTestPostReview_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "kelly_calendar"."CommunicationLiveTestProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationLiveTestPostReview_executionId_fkey"
    FOREIGN KEY ("executionId") REFERENCES "kelly_calendar"."CommunicationLiveTestExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationLiveTestPostReview_execution"
  ON "kelly_calendar"."CommunicationLiveTestPostReview"("executionId");

CREATE TABLE "kelly_calendar"."CommunicationLiveTestIncident" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "executionId" TEXT,
  "severity" "kelly_calendar"."CommLiveTestIncidentSeverity" NOT NULL DEFAULT 'WARNING',
  "incidentType" TEXT NOT NULL,
  "status" "kelly_calendar"."CommLiveTestIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "summary" TEXT NOT NULL,
  "evidenceJson" JSONB NOT NULL DEFAULT '{}',
  "containmentActionsJson" JSONB NOT NULL DEFAULT '[]',
  "resolutionNotes" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" TEXT,
  CONSTRAINT "CommunicationLiveTestIncident_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLiveTestIncident_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "kelly_calendar"."CommunicationLiveTestProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationLiveTestIncident_programId_idx"
  ON "kelly_calendar"."CommunicationLiveTestIncident"("programId");
