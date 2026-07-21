-- D23 Communications Template, Personalization & Composition Foundation
-- No production dispatch. Artifacts only; adapters transport rendered content.

ALTER TABLE "kelly_calendar"."CommunicationDispatchAttempt"
  ADD COLUMN IF NOT EXISTS "renderArtifactId" TEXT;

CREATE INDEX IF NOT EXISTS "CommunicationDispatchAttempt_renderArtifactId_idx"
  ON "kelly_calendar"."CommunicationDispatchAttempt"("renderArtifactId");

CREATE TYPE "kelly_calendar"."CommTemplateStatus" AS ENUM (
  'DRAFT', 'ACTIVE', 'RETIRED', 'ARCHIVED'
);
CREATE TYPE "kelly_calendar"."CommTemplateCategory" AS ENUM (
  'MISSION_PREPARATION', 'EVENT_REMINDER', 'EVENT_FOLLOW_UP', 'VOLUNTEER',
  'RELATIONSHIP_FOLLOW_UP', 'INTERNAL_NOTIFICATION', 'GENERAL_OUTREACH', 'TEST_ONLY'
);
CREATE TYPE "kelly_calendar"."CommTemplateVersionStatus" AS ENUM (
  'DRAFT', 'IN_REVIEW', 'APPROVED', 'SUPERSEDED', 'REJECTED'
);
CREATE TYPE "kelly_calendar"."CommBriefStatus" AS ENUM (
  'DRAFT', 'READY_FOR_COMPOSITION', 'COMPOSING', 'READY_FOR_REVIEW', 'APPROVED', 'CANCELLED'
);
CREATE TYPE "kelly_calendar"."CommCompositionValidationState" AS ENUM (
  'NOT_VALIDATED', 'VALID', 'WARNING', 'BLOCKED'
);
CREATE TYPE "kelly_calendar"."CommCompositionApprovalState" AS ENUM (
  'DRAFT', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REVOKED'
);
CREATE TYPE "kelly_calendar"."CommCompositionApprovalDecision" AS ENUM (
  'APPROVED', 'CHANGES_REQUESTED', 'REVOKED'
);
CREATE TYPE "kelly_calendar"."CommRenderPurpose" AS ENUM (
  'PREVIEW', 'TEST', 'APPROVAL', 'DISPATCH'
);

CREATE TABLE "kelly_calendar"."CommunicationTemplate" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "templateKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "purpose" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "status" "kelly_calendar"."CommTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "category" "kelly_calendar"."CommTemplateCategory" NOT NULL DEFAULT 'GENERAL_OUTREACH',
  "ownerType" TEXT NOT NULL DEFAULT 'CAMPAIGN',
  "createdByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunicationTemplate_scope_key"
  ON "kelly_calendar"."CommunicationTemplate"("campaignScopeKey", "templateKey");
CREATE INDEX "CommunicationTemplate_channel_status_idx"
  ON "kelly_calendar"."CommunicationTemplate"("channel", "status");

CREATE TABLE "kelly_calendar"."CommunicationTemplateVersion" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "kelly_calendar"."CommTemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "subjectTemplate" TEXT,
  "htmlTemplate" TEXT,
  "textTemplate" TEXT,
  "smsTemplate" TEXT,
  "requiredTokensJson" JSONB NOT NULL DEFAULT '[]',
  "optionalTokensJson" JSONB NOT NULL DEFAULT '[]',
  "defaultValuesJson" JSONB NOT NULL DEFAULT '{}',
  "complianceProfileKey" TEXT NOT NULL DEFAULT 'EMAIL_SANDBOX_TEST',
  "changeSummary" TEXT,
  "contentHash" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "approvedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  CONSTRAINT "CommunicationTemplateVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationTemplateVersion_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "kelly_calendar"."CommunicationTemplate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationTemplateVersion_template_version"
  ON "kelly_calendar"."CommunicationTemplateVersion"("templateId", "versionNumber");
CREATE INDEX "CommunicationTemplateVersion_status_idx"
  ON "kelly_calendar"."CommunicationTemplateVersion"("status");

CREATE TABLE "kelly_calendar"."CommunicationBrief" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "missionId" TEXT,
  "eventId" TEXT,
  "relationshipId" TEXT,
  "purpose" TEXT NOT NULL,
  "objective" TEXT,
  "audienceDescription" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "desiredAction" TEXT,
  "tone" TEXT,
  "factsJson" JSONB NOT NULL DEFAULT '[]',
  "prohibitedClaimsJson" JSONB NOT NULL DEFAULT '[]',
  "requiredContentJson" JSONB NOT NULL DEFAULT '[]',
  "operatorNotes" TEXT,
  "status" "kelly_calendar"."CommBriefStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationBrief_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommunicationBrief_status_idx" ON "kelly_calendar"."CommunicationBrief"("status");
CREATE INDEX "CommunicationBrief_missionId_idx" ON "kelly_calendar"."CommunicationBrief"("missionId");

CREATE TABLE "kelly_calendar"."CommunicationComposition" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "briefId" TEXT,
  "templateVersionId" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "name" TEXT NOT NULL,
  "subjectDraft" TEXT,
  "htmlDraft" TEXT,
  "textDraft" TEXT,
  "smsDraft" TEXT,
  "tokenOverridesJson" JSONB NOT NULL DEFAULT '{}',
  "linkMetadataJson" JSONB NOT NULL DEFAULT '{}',
  "validationState" "kelly_calendar"."CommCompositionValidationState" NOT NULL DEFAULT 'NOT_VALIDATED',
  "approvalState" "kelly_calendar"."CommCompositionApprovalState" NOT NULL DEFAULT 'DRAFT',
  "revisionNumber" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationComposition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationComposition_briefId_fkey"
    FOREIGN KEY ("briefId") REFERENCES "kelly_calendar"."CommunicationBrief"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CommunicationComposition_templateVersionId_fkey"
    FOREIGN KEY ("templateVersionId") REFERENCES "kelly_calendar"."CommunicationTemplateVersion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CommunicationComposition_approvalState_idx"
  ON "kelly_calendar"."CommunicationComposition"("approvalState");
CREATE INDEX "CommunicationComposition_channel_idx"
  ON "kelly_calendar"."CommunicationComposition"("channel");

CREATE TABLE "kelly_calendar"."CommunicationCompositionRevision" (
  "id" TEXT NOT NULL,
  "compositionId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "subjectSnapshot" TEXT,
  "htmlSnapshot" TEXT,
  "textSnapshot" TEXT,
  "smsSnapshot" TEXT,
  "tokenOverridesSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "contentHash" TEXT NOT NULL,
  "changeSummary" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationCompositionRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationCompositionRevision_compositionId_fkey"
    FOREIGN KEY ("compositionId") REFERENCES "kelly_calendar"."CommunicationComposition"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationCompositionRevision_comp_rev"
  ON "kelly_calendar"."CommunicationCompositionRevision"("compositionId", "revisionNumber");
CREATE INDEX "CommunicationCompositionRevision_contentHash_idx"
  ON "kelly_calendar"."CommunicationCompositionRevision"("contentHash");

CREATE TABLE "kelly_calendar"."CommunicationRenderArtifact" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "compositionId" TEXT NOT NULL,
  "compositionRevisionId" TEXT NOT NULL,
  "templateVersionId" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "renderPurpose" "kelly_calendar"."CommRenderPurpose" NOT NULL,
  "recipientFingerprint" TEXT NOT NULL,
  "personalizationFingerprint" TEXT NOT NULL,
  "subjectRendered" TEXT,
  "htmlRendered" TEXT,
  "textRendered" TEXT,
  "smsRendered" TEXT,
  "resolvedTokensJson" JSONB NOT NULL DEFAULT '{}',
  "unresolvedTokensJson" JSONB NOT NULL DEFAULT '[]',
  "linkManifestJson" JSONB NOT NULL DEFAULT '[]',
  "complianceManifestJson" JSONB NOT NULL DEFAULT '{}',
  "contentHash" TEXT NOT NULL,
  "renderEngineVersion" TEXT NOT NULL DEFAULT 'd23-1',
  "validationResultJson" JSONB NOT NULL DEFAULT '{}',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "invalidatedAt" TIMESTAMP(3),
  CONSTRAINT "CommunicationRenderArtifact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationRenderArtifact_compositionId_fkey"
    FOREIGN KEY ("compositionId") REFERENCES "kelly_calendar"."CommunicationComposition"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationRenderArtifact_compositionRevisionId_fkey"
    FOREIGN KEY ("compositionRevisionId") REFERENCES "kelly_calendar"."CommunicationCompositionRevision"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationRenderArtifact_templateVersionId_fkey"
    FOREIGN KEY ("templateVersionId") REFERENCES "kelly_calendar"."CommunicationTemplateVersion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CommunicationRenderArtifact_compositionId_renderPurpose_idx"
  ON "kelly_calendar"."CommunicationRenderArtifact"("compositionId", "renderPurpose");
CREATE INDEX "CommunicationRenderArtifact_contentHash_idx"
  ON "kelly_calendar"."CommunicationRenderArtifact"("contentHash");
CREATE INDEX "CommunicationRenderArtifact_renderPurpose_idx"
  ON "kelly_calendar"."CommunicationRenderArtifact"("renderPurpose");

CREATE TABLE "kelly_calendar"."CommunicationCompositionApproval" (
  "id" TEXT NOT NULL,
  "compositionId" TEXT NOT NULL,
  "compositionRevisionId" TEXT NOT NULL,
  "decision" "kelly_calendar"."CommCompositionApprovalDecision" NOT NULL,
  "reviewerUserId" TEXT,
  "reviewNotes" TEXT,
  "validationSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationCompositionApproval_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationCompositionApproval_compositionId_fkey"
    FOREIGN KEY ("compositionId") REFERENCES "kelly_calendar"."CommunicationComposition"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationCompositionApproval_compositionRevisionId_fkey"
    FOREIGN KEY ("compositionRevisionId") REFERENCES "kelly_calendar"."CommunicationCompositionRevision"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationCompositionApproval_compositionId_idx"
  ON "kelly_calendar"."CommunicationCompositionApproval"("compositionId");
