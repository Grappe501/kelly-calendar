-- D25 Communications Campaign, Scheduling & Controlled Execution
-- Production dispatch remains blocked. Sandbox modes only.

ALTER TABLE "kelly_calendar"."CommunicationDispatchAttempt"
  ADD COLUMN IF NOT EXISTS "campaignId" TEXT,
  ADD COLUMN IF NOT EXISTS "campaignRevisionId" TEXT,
  ADD COLUMN IF NOT EXISTS "executionRunId" TEXT,
  ADD COLUMN IF NOT EXISTS "executionBatchId" TEXT;
CREATE INDEX IF NOT EXISTS "CommunicationDispatchAttempt_campaignId_idx"
  ON "kelly_calendar"."CommunicationDispatchAttempt"("campaignId");
CREATE INDEX IF NOT EXISTS "CommunicationDispatchAttempt_executionRunId_idx"
  ON "kelly_calendar"."CommunicationDispatchAttempt"("executionRunId");
CREATE INDEX IF NOT EXISTS "CommunicationDispatchAttempt_executionBatchId_idx"
  ON "kelly_calendar"."CommunicationDispatchAttempt"("executionBatchId");

CREATE TYPE "kelly_calendar"."CommCampaignType" AS ENUM (
  'MISSION','EVENT','FOLLOW_UP','VOLUNTEER','RELATIONSHIP','INTERNAL','TEST_ONLY','GENERAL_OUTREACH'
);
CREATE TYPE "kelly_calendar"."CommCampaignStatus" AS ENUM (
  'DRAFT','CONFIGURING','READY_FOR_REVIEW','APPROVED','SCHEDULED','READY_TO_LAUNCH',
  'RUNNING','PAUSED','COMPLETED','COMPLETED_WITH_WARNINGS','CANCELLED','FAILED','ARCHIVED'
);
CREATE TYPE "kelly_calendar"."CommCampaignRevisionStatus" AS ENUM (
  'DRAFT','IN_REVIEW','APPROVED','SUPERSEDED','REJECTED'
);
CREATE TYPE "kelly_calendar"."CommExecutionPlanStatus" AS ENUM (
  'DRAFT','READY_FOR_REVIEW','APPROVED','REVOKED','SUPERSEDED'
);
CREATE TYPE "kelly_calendar"."CommExecutionMode" AS ENUM (
  'MANUAL_SANDBOX','SCHEDULED_SANDBOX','CONTROLLED_LIVE_TEST','PRODUCTION'
);
CREATE TYPE "kelly_calendar"."CommScheduleExceptionType" AS ENUM (
  'BLACKOUT','PAUSE_WINDOW','OPERATOR_OVERRIDE','EMERGENCY_HOLD'
);
CREATE TYPE "kelly_calendar"."CommLaunchReviewStatus" AS ENUM (
  'NOT_STARTED','IN_PROGRESS','BLOCKED','READY','APPROVED','REVOKED','EXPIRED'
);
CREATE TYPE "kelly_calendar"."CommLaunchAuthDecision" AS ENUM (
  'AUTHORIZED','CHANGES_REQUESTED','REVOKED'
);
CREATE TYPE "kelly_calendar"."CommExecutionRunStatus" AS ENUM (
  'PLANNED','READY','STARTING','RUNNING','PAUSING','PAUSED','RESUMING','COMPLETING',
  'COMPLETED','COMPLETED_WITH_WARNINGS','CANCELLING','CANCELLED','FAILED','EXPIRED'
);
CREATE TYPE "kelly_calendar"."CommExecutionBatchStatus" AS ENUM (
  'PLANNED','READY','RUNNING','PAUSED','COMPLETED','COMPLETED_WITH_WARNINGS','CANCELLED','FAILED'
);
CREATE TYPE "kelly_calendar"."CommRetryEligibility" AS ENUM (
  'NON_RETRYABLE','RETRYABLE','REVIEW_REQUIRED','UNKNOWN'
);
CREATE TYPE "kelly_calendar"."CommRetryDecisionStatus" AS ENUM (
  'NOT_ELIGIBLE','ELIGIBLE','APPROVED','DECLINED','EXECUTED','EXPIRED'
);
CREATE TYPE "kelly_calendar"."CommCompletionReportStatus" AS ENUM (
  'DRAFT','FINALIZED','SUPERSEDED'
);

CREATE TABLE "kelly_calendar"."CommunicationCampaign" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "campaignKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "purpose" TEXT,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "campaignType" "kelly_calendar"."CommCampaignType" NOT NULL DEFAULT 'TEST_ONLY',
  "status" "kelly_calendar"."CommCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "missionId" TEXT,
  "eventId" TEXT,
  "compositionId" TEXT,
  "approvedCompositionRevisionId" TEXT,
  "recipientManifestId" TEXT,
  "providerKey" TEXT NOT NULL DEFAULT 'kccc-sandbox',
  "providerMode" TEXT NOT NULL DEFAULT 'SANDBOX',
  "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
  "ownerUserId" TEXT,
  "createdByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationCampaign_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommunicationCampaign_scope_key"
  ON "kelly_calendar"."CommunicationCampaign"("campaignScopeKey", "campaignKey");
CREATE INDEX "CommunicationCampaign_status_idx" ON "kelly_calendar"."CommunicationCampaign"("status");
CREATE INDEX "CommunicationCampaign_compositionId_idx" ON "kelly_calendar"."CommunicationCampaign"("compositionId");
CREATE INDEX "CommunicationCampaign_recipientManifestId_idx" ON "kelly_calendar"."CommunicationCampaign"("recipientManifestId");

CREATE TABLE "kelly_calendar"."CommunicationCampaignRevision" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "status" "kelly_calendar"."CommCampaignRevisionStatus" NOT NULL DEFAULT 'DRAFT',
  "configurationSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "compositionRevisionId" TEXT,
  "recipientManifestId" TEXT,
  "providerKey" TEXT NOT NULL DEFAULT 'kccc-sandbox',
  "providerMode" TEXT NOT NULL DEFAULT 'SANDBOX',
  "scheduleSnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "ratePolicySnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "retryPolicySnapshotJson" JSONB NOT NULL DEFAULT '{}',
  "contentHash" TEXT NOT NULL,
  "changeSummary" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "supersededAt" TIMESTAMP(3),
  CONSTRAINT "CommunicationCampaignRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationCampaignRevision_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "kelly_calendar"."CommunicationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationCampaignRevision_campaign_version"
  ON "kelly_calendar"."CommunicationCampaignRevision"("campaignId", "revisionNumber");
CREATE INDEX "CommunicationCampaignRevision_status_idx"
  ON "kelly_calendar"."CommunicationCampaignRevision"("status");

CREATE TABLE "kelly_calendar"."CommunicationExecutionPlan" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "campaignRevisionId" TEXT NOT NULL,
  "status" "kelly_calendar"."CommExecutionPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "executionMode" "kelly_calendar"."CommExecutionMode" NOT NULL DEFAULT 'MANUAL_SANDBOX',
  "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
  "scheduledStartAt" TIMESTAMP(3),
  "scheduledEndAt" TIMESTAMP(3),
  "allowedWeekdaysJson" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
  "dailyWindowStart" TEXT,
  "dailyWindowEnd" TEXT,
  "maximumRecipients" INTEGER NOT NULL DEFAULT 25,
  "maximumBatchSize" INTEGER NOT NULL DEFAULT 5,
  "maximumAttemptsPerRun" INTEGER NOT NULL DEFAULT 25,
  "maximumAttemptsPerHour" INTEGER NOT NULL DEFAULT 25,
  "minimumDelayBetweenBatchesSeconds" INTEGER NOT NULL DEFAULT 30,
  "retryPolicyJson" JSONB NOT NULL DEFAULT '{}',
  "failureThresholdJson" JSONB NOT NULL DEFAULT '{}',
  "pauseThresholdJson" JSONB NOT NULL DEFAULT '{}',
  "completionPolicyJson" JSONB NOT NULL DEFAULT '{}',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "CommunicationExecutionPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationExecutionPlan_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "kelly_calendar"."CommunicationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationExecutionPlan_campaignRevisionId_fkey"
    FOREIGN KEY ("campaignRevisionId") REFERENCES "kelly_calendar"."CommunicationCampaignRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationExecutionPlan_campaignId_idx"
  ON "kelly_calendar"."CommunicationExecutionPlan"("campaignId");
CREATE INDEX "CommunicationExecutionPlan_status_idx"
  ON "kelly_calendar"."CommunicationExecutionPlan"("status");

CREATE TABLE "kelly_calendar"."CommunicationCampaignScheduleException" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "exceptionType" "kelly_calendar"."CommScheduleExceptionType" NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
  "reason" TEXT,
  "approvedByUserId" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationCampaignScheduleException_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationCampaignScheduleException_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "kelly_calendar"."CommunicationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationCampaignScheduleException_campaignId_idx"
  ON "kelly_calendar"."CommunicationCampaignScheduleException"("campaignId");

CREATE TABLE "kelly_calendar"."CommunicationLaunchReview" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "campaignRevisionId" TEXT NOT NULL,
  "executionPlanId" TEXT NOT NULL,
  "status" "kelly_calendar"."CommLaunchReviewStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "compositionCheckJson" JSONB NOT NULL DEFAULT '{}',
  "audienceCheckJson" JSONB NOT NULL DEFAULT '{}',
  "consentCheckJson" JSONB NOT NULL DEFAULT '{}',
  "suppressionCheckJson" JSONB NOT NULL DEFAULT '{}',
  "providerCheckJson" JSONB NOT NULL DEFAULT '{}',
  "scheduleCheckJson" JSONB NOT NULL DEFAULT '{}',
  "volumeCheckJson" JSONB NOT NULL DEFAULT '{}',
  "complianceCheckJson" JSONB NOT NULL DEFAULT '{}',
  "securityCheckJson" JSONB NOT NULL DEFAULT '{}',
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
  CONSTRAINT "CommunicationLaunchReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLaunchReview_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "kelly_calendar"."CommunicationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationLaunchReview_campaignRevisionId_fkey"
    FOREIGN KEY ("campaignRevisionId") REFERENCES "kelly_calendar"."CommunicationCampaignRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationLaunchReview_executionPlanId_fkey"
    FOREIGN KEY ("executionPlanId") REFERENCES "kelly_calendar"."CommunicationExecutionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationLaunchReview_campaignId_idx"
  ON "kelly_calendar"."CommunicationLaunchReview"("campaignId");
CREATE INDEX "CommunicationLaunchReview_status_idx"
  ON "kelly_calendar"."CommunicationLaunchReview"("status");

CREATE TABLE "kelly_calendar"."CommunicationLaunchAuthorization" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "campaignRevisionId" TEXT NOT NULL,
  "launchReviewId" TEXT NOT NULL,
  "decision" "kelly_calendar"."CommLaunchAuthDecision" NOT NULL,
  "authorizedMode" "kelly_calendar"."CommExecutionMode" NOT NULL DEFAULT 'MANUAL_SANDBOX',
  "authorizedRecipientLimit" INTEGER NOT NULL DEFAULT 10,
  "authorizedBatchLimit" INTEGER NOT NULL DEFAULT 5,
  "authorizedStartAt" TIMESTAMP(3),
  "authorizedEndAt" TIMESTAMP(3),
  "authorizationHash" TEXT NOT NULL,
  "authorizedByUserId" TEXT,
  "authorizationNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "revocationReason" TEXT,
  CONSTRAINT "CommunicationLaunchAuthorization_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationLaunchAuthorization_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "kelly_calendar"."CommunicationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationLaunchAuthorization_campaignRevisionId_fkey"
    FOREIGN KEY ("campaignRevisionId") REFERENCES "kelly_calendar"."CommunicationCampaignRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationLaunchAuthorization_launchReviewId_fkey"
    FOREIGN KEY ("launchReviewId") REFERENCES "kelly_calendar"."CommunicationLaunchReview"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationLaunchAuthorization_campaignId_idx"
  ON "kelly_calendar"."CommunicationLaunchAuthorization"("campaignId");

CREATE TABLE "kelly_calendar"."CommunicationExecutionRun" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "campaignRevisionId" TEXT NOT NULL,
  "executionPlanId" TEXT NOT NULL,
  "launchAuthorizationId" TEXT NOT NULL,
  "runNumber" INTEGER NOT NULL,
  "mode" "kelly_calendar"."CommExecutionMode" NOT NULL DEFAULT 'MANUAL_SANDBOX',
  "status" "kelly_calendar"."CommExecutionRunStatus" NOT NULL DEFAULT 'PLANNED',
  "scheduledFor" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "resumedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "pauseReason" TEXT,
  "cancelReason" TEXT,
  "recipientTargetCount" INTEGER NOT NULL DEFAULT 0,
  "attemptCreatedCount" INTEGER NOT NULL DEFAULT 0,
  "preflightPassedCount" INTEGER NOT NULL DEFAULT 0,
  "preflightBlockedCount" INTEGER NOT NULL DEFAULT 0,
  "providerAcceptedCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "suppressedCount" INTEGER NOT NULL DEFAULT 0,
  "consentBlockedCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateBlockedCount" INTEGER NOT NULL DEFAULT 0,
  "invalidDestinationCount" INTEGER NOT NULL DEFAULT 0,
  "retryEligibleCount" INTEGER NOT NULL DEFAULT 0,
  "retryCreatedCount" INTEGER NOT NULL DEFAULT 0,
  "currentBatchNumber" INTEGER NOT NULL DEFAULT 0,
  "lastHeartbeatAt" TIMESTAMP(3),
  "failureSummaryJson" JSONB NOT NULL DEFAULT '{}',
  "completionSummaryJson" JSONB NOT NULL DEFAULT '{}',
  "createdByUserId" TEXT,
  "startedByUserId" TEXT,
  "completedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationExecutionRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationExecutionRun_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "kelly_calendar"."CommunicationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationExecutionRun_campaignRevisionId_fkey"
    FOREIGN KEY ("campaignRevisionId") REFERENCES "kelly_calendar"."CommunicationCampaignRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationExecutionRun_executionPlanId_fkey"
    FOREIGN KEY ("executionPlanId") REFERENCES "kelly_calendar"."CommunicationExecutionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationExecutionRun_launchAuthorizationId_fkey"
    FOREIGN KEY ("launchAuthorizationId") REFERENCES "kelly_calendar"."CommunicationLaunchAuthorization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationExecutionRun_campaign_run"
  ON "kelly_calendar"."CommunicationExecutionRun"("campaignId", "runNumber");
CREATE INDEX "CommunicationExecutionRun_status_idx"
  ON "kelly_calendar"."CommunicationExecutionRun"("status");

CREATE TABLE "kelly_calendar"."CommunicationExecutionBatch" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "batchNumber" INTEGER NOT NULL,
  "status" "kelly_calendar"."CommExecutionBatchStatus" NOT NULL DEFAULT 'PLANNED',
  "recipientStartIndex" INTEGER NOT NULL DEFAULT 0,
  "recipientEndIndex" INTEGER NOT NULL DEFAULT 0,
  "plannedCount" INTEGER NOT NULL DEFAULT 0,
  "attemptCreatedCount" INTEGER NOT NULL DEFAULT 0,
  "preflightPassedCount" INTEGER NOT NULL DEFAULT 0,
  "preflightBlockedCount" INTEGER NOT NULL DEFAULT 0,
  "providerAcceptedCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationExecutionBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationExecutionBatch_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "kelly_calendar"."CommunicationExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CommunicationExecutionBatch_run_batch"
  ON "kelly_calendar"."CommunicationExecutionBatch"("runId", "batchNumber");
CREATE INDEX "CommunicationExecutionBatch_status_idx"
  ON "kelly_calendar"."CommunicationExecutionBatch"("status");

CREATE TABLE "kelly_calendar"."CommunicationRetryDecision" (
  "id" TEXT NOT NULL,
  "originalAttemptId" TEXT NOT NULL,
  "executionRunId" TEXT NOT NULL,
  "failureClass" "kelly_calendar"."CommRetryEligibility" NOT NULL DEFAULT 'UNKNOWN',
  "retryEligibility" "kelly_calendar"."CommRetryEligibility" NOT NULL DEFAULT 'UNKNOWN',
  "decision" "kelly_calendar"."CommRetryDecisionStatus" NOT NULL DEFAULT 'NOT_ELIGIBLE',
  "decisionReason" TEXT,
  "retryAttemptId" TEXT,
  "reviewedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  CONSTRAINT "CommunicationRetryDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationRetryDecision_executionRunId_fkey"
    FOREIGN KEY ("executionRunId") REFERENCES "kelly_calendar"."CommunicationExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationRetryDecision_executionRunId_idx"
  ON "kelly_calendar"."CommunicationRetryDecision"("executionRunId");

CREATE TABLE "kelly_calendar"."CommunicationCampaignCompletionReport" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "executionRunId" TEXT NOT NULL,
  "status" "kelly_calendar"."CommCompletionReportStatus" NOT NULL DEFAULT 'DRAFT',
  "manifestCount" INTEGER NOT NULL DEFAULT 0,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "preflightPassedCount" INTEGER NOT NULL DEFAULT 0,
  "preflightBlockedCount" INTEGER NOT NULL DEFAULT 0,
  "providerAcceptedCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "bouncedCount" INTEGER NOT NULL DEFAULT 0,
  "complaintCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "unknownCount" INTEGER NOT NULL DEFAULT 0,
  "suppressedDuringRunCount" INTEGER NOT NULL DEFAULT 0,
  "consentChangedDuringRunCount" INTEGER NOT NULL DEFAULT 0,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "summaryJson" JSONB NOT NULL DEFAULT '{}',
  "blockingIssuesJson" JSONB NOT NULL DEFAULT '[]',
  "warningsJson" JSONB NOT NULL DEFAULT '[]',
  "evidenceHash" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationCampaignCompletionReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunicationCampaignCompletionReport_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "kelly_calendar"."CommunicationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunicationCampaignCompletionReport_executionRunId_fkey"
    FOREIGN KEY ("executionRunId") REFERENCES "kelly_calendar"."CommunicationExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CommunicationCampaignCompletionReport_campaignId_idx"
  ON "kelly_calendar"."CommunicationCampaignCompletionReport"("campaignId");
CREATE UNIQUE INDEX "CommunicationCampaignCompletionReport_run"
  ON "kelly_calendar"."CommunicationCampaignCompletionReport"("executionRunId");
