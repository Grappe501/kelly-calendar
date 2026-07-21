-- D24 Communications Audience, Segmentation & Recipient Resolution
-- No production dispatch. Person-first; no arbitrary SQL/CSV blast.

ALTER TABLE "kelly_calendar"."CommunicationDispatchBatch"
  ADD COLUMN IF NOT EXISTS "recipientManifestId" TEXT;
CREATE INDEX IF NOT EXISTS "CommunicationDispatchBatch_recipientManifestId_idx"
  ON "kelly_calendar"."CommunicationDispatchBatch"("recipientManifestId");

ALTER TABLE "kelly_calendar"."CommunicationDispatchAttempt"
  ADD COLUMN IF NOT EXISTS "recipientManifestEntryId" TEXT;
CREATE INDEX IF NOT EXISTS "CommunicationDispatchAttempt_recipientManifestEntryId_idx"
  ON "kelly_calendar"."CommunicationDispatchAttempt"("recipientManifestEntryId");

CREATE TYPE "kelly_calendar"."CommAudienceType" AS ENUM (
  'STATIC','DYNAMIC','MISSION','EVENT','RELATIONSHIP','INTERNAL','TEST_ONLY'
);
CREATE TYPE "kelly_calendar"."CommAudienceChannelScope" AS ENUM (
  'EMAIL','SMS','MULTI_CHANNEL'
);
CREATE TYPE "kelly_calendar"."CommAudienceStatus" AS ENUM (
  'DRAFT','READY_FOR_EVALUATION','IN_REVIEW','APPROVED','RETIRED','ARCHIVED'
);
CREATE TYPE "kelly_calendar"."CommSegmentDefinitionStatus" AS ENUM (
  'DRAFT','IN_REVIEW','APPROVED','SUPERSEDED','REJECTED'
);
CREATE TYPE "kelly_calendar"."CommAudienceEvaluationType" AS ENUM (
  'PREVIEW','REVIEW','MANIFEST','TEST'
);
CREATE TYPE "kelly_calendar"."CommAudienceEvaluationStatus" AS ENUM (
  'PENDING','RUNNING','COMPLETED','COMPLETED_WITH_WARNINGS','BLOCKED','FAILED','CANCELLED'
);
CREATE TYPE "kelly_calendar"."CommAudienceCandidateStatus" AS ENUM (
  'INCLUDED','EXCLUDED','BLOCKED','DUPLICATE_PERSON','DUPLICATE_DESTINATION',
  'INVALID_DESTINATION','MISSING_DESTINATION','CONSENT_REQUIRED','SUPPRESSED'
);
CREATE TYPE "kelly_calendar"."CommRecipientManifestStatus" AS ENUM (
  'DRAFT','READY_FOR_REVIEW','APPROVED','REVOKED','EXPIRED'
);
CREATE TYPE "kelly_calendar"."CommAudienceApprovalDecision" AS ENUM (
  'APPROVED','CHANGES_REQUESTED','REVOKED'
);

CREATE TABLE "kelly_calendar"."CommunicationAudience" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "audienceKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "audienceType" "kelly_calendar"."CommAudienceType" NOT NULL DEFAULT 'DYNAMIC',
  "channelScope" "kelly_calendar"."CommAudienceChannelScope" NOT NULL DEFAULT 'EMAIL',
  "status" "kelly_calendar"."CommAudienceStatus" NOT NULL DEFAULT 'DRAFT',
  "purpose" TEXT,
  "ownerType" TEXT NOT NULL DEFAULT 'CAMPAIGN',
  "missionId" TEXT,
  "eventId" TEXT,
  "createdByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationAudience_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunicationAudience_scope_key"
  ON "kelly_calendar"."CommunicationAudience"("campaignScopeKey", "audienceKey");
CREATE INDEX "CommunicationAudience_status_idx" ON "kelly_calendar"."CommunicationAudience"("status");
CREATE INDEX "CommunicationAudience_missionId_idx" ON "kelly_calendar"."CommunicationAudience"("missionId");
CREATE INDEX "CommunicationAudience_eventId_idx" ON "kelly_calendar"."CommunicationAudience"("eventId");

CREATE TABLE "kelly_calendar"."CommunicationAudienceStaticMember" (
  "id" TEXT NOT NULL,
  "audienceId" TEXT NOT NULL,
  "localPersonId" TEXT NOT NULL,
  "inclusionReason" TEXT,
  "addedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationAudienceStaticMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationAudienceStaticMember_audienceId_fkey"
    FOREIGN KEY ("audienceId") REFERENCES "kelly_calendar"."CommunicationAudience"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationAudienceStaticMember_audience_person"
  ON "kelly_calendar"."CommunicationAudienceStaticMember"("audienceId", "localPersonId");
CREATE INDEX "CommunicationAudienceStaticMember_localPersonId_idx"
  ON "kelly_calendar"."CommunicationAudienceStaticMember"("localPersonId");

CREATE TABLE "kelly_calendar"."CommunicationSegmentDefinition" (
  "id" TEXT NOT NULL,
  "audienceId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "kelly_calendar"."CommSegmentDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "criteriaJson" JSONB NOT NULL DEFAULT '{}',
  "criteriaSchemaVersion" TEXT NOT NULL DEFAULT 'd24-1',
  "sourcePolicyJson" JSONB NOT NULL DEFAULT '{}',
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "estimatedSize" INTEGER,
  "evaluationLimit" INTEGER NOT NULL DEFAULT 500,
  "contentHash" TEXT NOT NULL,
  "changeSummary" TEXT,
  "createdByUserId" TEXT,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "supersededAt" TIMESTAMP(3),
  CONSTRAINT "CommunicationSegmentDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationSegmentDefinition_audienceId_fkey"
    FOREIGN KEY ("audienceId") REFERENCES "kelly_calendar"."CommunicationAudience"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationSegmentDefinition_audience_version"
  ON "kelly_calendar"."CommunicationSegmentDefinition"("audienceId", "versionNumber");
CREATE INDEX "CommunicationSegmentDefinition_status_idx"
  ON "kelly_calendar"."CommunicationSegmentDefinition"("status");

CREATE TABLE "kelly_calendar"."CommunicationAudienceEvaluation" (
  "id" TEXT NOT NULL,
  "audienceId" TEXT NOT NULL,
  "segmentDefinitionId" TEXT NOT NULL,
  "evaluationType" "kelly_calendar"."CommAudienceEvaluationType" NOT NULL DEFAULT 'PREVIEW',
  "status" "kelly_calendar"."CommAudienceEvaluationStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "sourceAsOf" TIMESTAMP(3),
  "candidateCount" INTEGER NOT NULL DEFAULT 0,
  "includedCount" INTEGER NOT NULL DEFAULT 0,
  "excludedCount" INTEGER NOT NULL DEFAULT 0,
  "duplicatePersonCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateDestinationCount" INTEGER NOT NULL DEFAULT 0,
  "invalidDestinationCount" INTEGER NOT NULL DEFAULT 0,
  "consentBlockedCount" INTEGER NOT NULL DEFAULT 0,
  "suppressedCount" INTEGER NOT NULL DEFAULT 0,
  "limitApplied" BOOLEAN NOT NULL DEFAULT false,
  "criteriaHash" TEXT NOT NULL,
  "sourceFingerprint" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationAudienceEvaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationAudienceEvaluation_audienceId_fkey"
    FOREIGN KEY ("audienceId") REFERENCES "kelly_calendar"."CommunicationAudience"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationAudienceEvaluation_segmentDefinitionId_fkey"
    FOREIGN KEY ("segmentDefinitionId") REFERENCES "kelly_calendar"."CommunicationSegmentDefinition"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationAudienceEvaluation_audienceId_idx"
  ON "kelly_calendar"."CommunicationAudienceEvaluation"("audienceId");
CREATE INDEX "CommunicationAudienceEvaluation_status_idx"
  ON "kelly_calendar"."CommunicationAudienceEvaluation"("status");

CREATE TABLE "kelly_calendar"."CommunicationAudienceCandidate" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "localPersonId" TEXT,
  "relationshipId" TEXT,
  "missionParticipantId" TEXT,
  "eventParticipantId" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "candidateStatus" "kelly_calendar"."CommAudienceCandidateStatus" NOT NULL,
  "inclusionReasonsJson" JSONB NOT NULL DEFAULT '[]',
  "exclusionReasonsJson" JSONB NOT NULL DEFAULT '[]',
  "sourceFactsJson" JSONB NOT NULL DEFAULT '{}',
  "resolvedContactPointId" TEXT,
  "destinationFingerprint" TEXT,
  "destinationMasked" TEXT,
  "consentSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "suppressionSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "deduplicationKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationAudienceCandidate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationAudienceCandidate_evaluationId_fkey"
    FOREIGN KEY ("evaluationId") REFERENCES "kelly_calendar"."CommunicationAudienceEvaluation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationAudienceCandidate_evaluationId_candidateStatus_idx"
  ON "kelly_calendar"."CommunicationAudienceCandidate"("evaluationId", "candidateStatus");
CREATE INDEX "CommunicationAudienceCandidate_localPersonId_idx"
  ON "kelly_calendar"."CommunicationAudienceCandidate"("localPersonId");
CREATE INDEX "CommunicationAudienceCandidate_destinationFingerprint_idx"
  ON "kelly_calendar"."CommunicationAudienceCandidate"("destinationFingerprint");

CREATE TABLE "kelly_calendar"."CommunicationRecipientManifest" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "audienceId" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "segmentDefinitionId" TEXT NOT NULL,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "status" "kelly_calendar"."CommRecipientManifestStatus" NOT NULL DEFAULT 'DRAFT',
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "manifestHash" TEXT NOT NULL,
  "criteriaHash" TEXT NOT NULL,
  "sourceFingerprint" TEXT NOT NULL,
  "consentPolicyVersion" TEXT,
  "suppressionPolicyVersion" TEXT,
  "createdByUserId" TEXT,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  CONSTRAINT "CommunicationRecipientManifest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationRecipientManifest_audienceId_fkey"
    FOREIGN KEY ("audienceId") REFERENCES "kelly_calendar"."CommunicationAudience"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationRecipientManifest_evaluationId_fkey"
    FOREIGN KEY ("evaluationId") REFERENCES "kelly_calendar"."CommunicationAudienceEvaluation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationRecipientManifest_segmentDefinitionId_fkey"
    FOREIGN KEY ("segmentDefinitionId") REFERENCES "kelly_calendar"."CommunicationSegmentDefinition"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationRecipientManifest_audienceId_idx"
  ON "kelly_calendar"."CommunicationRecipientManifest"("audienceId");
CREATE INDEX "CommunicationRecipientManifest_status_idx"
  ON "kelly_calendar"."CommunicationRecipientManifest"("status");
CREATE INDEX "CommunicationRecipientManifest_manifestHash_idx"
  ON "kelly_calendar"."CommunicationRecipientManifest"("manifestHash");

CREATE TABLE "kelly_calendar"."CommunicationRecipientManifestEntry" (
  "id" TEXT NOT NULL,
  "manifestId" TEXT NOT NULL,
  "localPersonId" TEXT,
  "contactPointId" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "destinationFingerprint" TEXT NOT NULL,
  "destinationMasked" TEXT NOT NULL,
  "recipientKey" TEXT NOT NULL,
  "personalizationSourceFingerprint" TEXT NOT NULL,
  "consentSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "suppressionSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "eligibilityReasonsJson" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "invalidatedAt" TIMESTAMP(3),
  CONSTRAINT "CommunicationRecipientManifestEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationRecipientManifestEntry_manifestId_fkey"
    FOREIGN KEY ("manifestId") REFERENCES "kelly_calendar"."CommunicationRecipientManifest"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationRecipientManifestEntry_manifest_recipient"
  ON "kelly_calendar"."CommunicationRecipientManifestEntry"("manifestId", "recipientKey");
CREATE INDEX "CommunicationRecipientManifestEntry_destinationFingerprint_idx"
  ON "kelly_calendar"."CommunicationRecipientManifestEntry"("destinationFingerprint");
CREATE INDEX "CommunicationRecipientManifestEntry_localPersonId_idx"
  ON "kelly_calendar"."CommunicationRecipientManifestEntry"("localPersonId");

CREATE TABLE "kelly_calendar"."CommunicationAudienceApproval" (
  "id" TEXT NOT NULL,
  "audienceId" TEXT NOT NULL,
  "segmentDefinitionId" TEXT,
  "evaluationId" TEXT,
  "manifestId" TEXT,
  "decision" "kelly_calendar"."CommAudienceApprovalDecision" NOT NULL,
  "reviewerUserId" TEXT,
  "reviewNotes" TEXT,
  "criteriaHash" TEXT,
  "manifestHash" TEXT,
  "summarySnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationAudienceApproval_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationAudienceApproval_audienceId_fkey"
    FOREIGN KEY ("audienceId") REFERENCES "kelly_calendar"."CommunicationAudience"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationAudienceApproval_segmentDefinitionId_fkey"
    FOREIGN KEY ("segmentDefinitionId") REFERENCES "kelly_calendar"."CommunicationSegmentDefinition"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CommunicationAudienceApproval_evaluationId_fkey"
    FOREIGN KEY ("evaluationId") REFERENCES "kelly_calendar"."CommunicationAudienceEvaluation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CommunicationAudienceApproval_manifestId_fkey"
    FOREIGN KEY ("manifestId") REFERENCES "kelly_calendar"."CommunicationRecipientManifest"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CommunicationAudienceApproval_audienceId_idx"
  ON "kelly_calendar"."CommunicationAudienceApproval"("audienceId");
