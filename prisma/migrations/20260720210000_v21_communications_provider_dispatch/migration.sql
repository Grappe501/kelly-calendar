-- V2.1 Communications Provider Dispatch Foundation (D21)
-- Additive. Production dispatch remains disabled without an authorized provider.
-- Owned schema: kelly_calendar

CREATE TYPE "kelly_calendar"."CommProviderMode" AS ENUM (
  'DISABLED', 'SANDBOX', 'PRODUCTION'
);

CREATE TYPE "kelly_calendar"."CommProviderConfigState" AS ENUM (
  'NOT_CONFIGURED', 'PARTIAL', 'CONFIGURED', 'VERIFIED', 'DEGRADED', 'DISABLED'
);

CREATE TYPE "kelly_calendar"."CommDispatchBatchStatus" AS ENUM (
  'DRAFT', 'PREFLIGHT_FAILED', 'READY', 'RUNNING', 'PAUSED', 'COMPLETED',
  'COMPLETED_WITH_ERRORS', 'CANCELLED', 'BLOCKED'
);

CREATE TYPE "kelly_calendar"."CommDispatchAttemptStatus" AS ENUM (
  'REQUESTED', 'PROVIDER_ACCEPTED', 'PROVIDER_REJECTED', 'UNKNOWN_OUTCOME',
  'BLOCKED', 'CANCELLED'
);

CREATE TYPE "kelly_calendar"."CommWebhookProcessingStatus" AS ENUM (
  'RECEIVED', 'VERIFIED', 'REJECTED', 'PROCESSED', 'DUPLICATE', 'UNMATCHED', 'UNSUPPORTED'
);

CREATE TABLE "kelly_calendar"."CommunicationProviderConnection" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "providerKey" TEXT NOT NULL,
  "mode" "kelly_calendar"."CommProviderMode" NOT NULL DEFAULT 'DISABLED',
  "configurationState" "kelly_calendar"."CommProviderConfigState" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "capabilitySnapshot" JSONB NOT NULL DEFAULT '{}',
  "senderIdentitySummary" TEXT,
  "lastVerifiedAt" TIMESTAMP(3),
  "lastSuccessfulRequestAt" TIMESTAMP(3),
  "lastErrorCategory" TEXT,
  "lastErrorSummaryRedacted" TEXT,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "webhooksEnabled" BOOLEAN NOT NULL DEFAULT false,
  "applicationDispatchEnabled" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunicationProviderConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationProviderConnection_scope_provider_key"
  ON "kelly_calendar"."CommunicationProviderConnection"("campaignScopeKey", "providerKey");
CREATE INDEX "CommunicationProviderConnection_mode_idx"
  ON "kelly_calendar"."CommunicationProviderConnection"("mode");

CREATE TABLE "kelly_calendar"."CommunicationDispatchControl" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "version" INTEGER NOT NULL DEFAULT 1,
  "globalKillSwitch" BOOLEAN NOT NULL DEFAULT true,
  "emailKillSwitch" BOOLEAN NOT NULL DEFAULT true,
  "smsKillSwitch" BOOLEAN NOT NULL DEFAULT true,
  "reason" TEXT NOT NULL DEFAULT 'D21 default — production dispatch disabled',
  "changedByUserId" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunicationDispatchControl_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationDispatchControl_campaignScopeKey_key"
  ON "kelly_calendar"."CommunicationDispatchControl"("campaignScopeKey");

CREATE TABLE "kelly_calendar"."CommunicationDispatchBatch" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "communicationId" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "channel" "kelly_calendar"."CampaignCommChannel" NOT NULL,
  "status" "kelly_calendar"."CommDispatchBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "contentFingerprint" TEXT NOT NULL,
  "audienceFingerprint" TEXT NOT NULL,
  "policyVersion" INTEGER,
  "policyFingerprint" TEXT,
  "queueItemCount" INTEGER NOT NULL DEFAULT 0,
  "acceptedCount" INTEGER NOT NULL DEFAULT 0,
  "rejectedCount" INTEGER NOT NULL DEFAULT 0,
  "unknownCount" INTEGER NOT NULL DEFAULT 0,
  "blockedCount" INTEGER NOT NULL DEFAULT 0,
  "killSwitchSnapshot" JSONB NOT NULL DEFAULT '{}',
  "capabilityVersion" TEXT,
  "maxBatchSize" INTEGER NOT NULL DEFAULT 25,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "requestedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunicationDispatchBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunicationDispatchBatch_communicationId_idx"
  ON "kelly_calendar"."CommunicationDispatchBatch"("communicationId");
CREATE INDEX "CommunicationDispatchBatch_status_idx"
  ON "kelly_calendar"."CommunicationDispatchBatch"("status");

ALTER TABLE "kelly_calendar"."CommunicationDispatchBatch"
  ADD CONSTRAINT "CommunicationDispatchBatch_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "kelly_calendar"."CampaignCommunication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CommunicationDispatchAttempt" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "queueItemId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "idempotencyKey" TEXT NOT NULL,
  "requestCorrelationId" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "status" "kelly_calendar"."CommDispatchAttemptStatus" NOT NULL DEFAULT 'REQUESTED',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "errorCategory" TEXT,
  "unknownOutcome" BOOLEAN NOT NULL DEFAULT false,
  "reconciliationState" TEXT NOT NULL DEFAULT 'NONE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationDispatchAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationDispatchAttempt_idempotencyKey_key"
  ON "kelly_calendar"."CommunicationDispatchAttempt"("idempotencyKey");
CREATE INDEX "CommunicationDispatchAttempt_batchId_idx"
  ON "kelly_calendar"."CommunicationDispatchAttempt"("batchId");
CREATE INDEX "CommunicationDispatchAttempt_queueItemId_idx"
  ON "kelly_calendar"."CommunicationDispatchAttempt"("queueItemId");
CREATE INDEX "CommunicationDispatchAttempt_providerMessageId_idx"
  ON "kelly_calendar"."CommunicationDispatchAttempt"("providerMessageId");

ALTER TABLE "kelly_calendar"."CommunicationDispatchAttempt"
  ADD CONSTRAINT "CommunicationDispatchAttempt_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "kelly_calendar"."CommunicationDispatchBatch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."CommunicationDispatchAttempt"
  ADD CONSTRAINT "CommunicationDispatchAttempt_queueItemId_fkey"
  FOREIGN KEY ("queueItemId") REFERENCES "kelly_calendar"."CampaignCommunicationQueueItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CommunicationWebhookReceipt" (
  "id" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "providerEventId" TEXT,
  "signatureValid" BOOLEAN NOT NULL DEFAULT false,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "providerEventAt" TIMESTAMP(3),
  "replayFingerprint" TEXT NOT NULL,
  "processingStatus" "kelly_calendar"."CommWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "matchedAttemptId" TEXT,
  "normalizedEventCount" INTEGER NOT NULL DEFAULT 0,
  "errorCategory" TEXT,
  "purgeAfter" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunicationWebhookReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationWebhookReceipt_replayFingerprint_key"
  ON "kelly_calendar"."CommunicationWebhookReceipt"("replayFingerprint");
CREATE INDEX "CommunicationWebhookReceipt_providerKey_idx"
  ON "kelly_calendar"."CommunicationWebhookReceipt"("providerKey");
CREATE INDEX "CommunicationWebhookReceipt_providerEventId_idx"
  ON "kelly_calendar"."CommunicationWebhookReceipt"("providerEventId");
CREATE INDEX "CommunicationWebhookReceipt_matchedAttemptId_idx"
  ON "kelly_calendar"."CommunicationWebhookReceipt"("matchedAttemptId");
