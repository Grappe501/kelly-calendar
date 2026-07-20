-- V2.1 Mobilize Integration Foundation (D16)
-- Additive. Credentials never stored. Outbound writes forced disabled at app layer.
-- Owned schema: kelly_calendar

CREATE TYPE "kelly_calendar"."ExternalIntegrationConnectionStatus" AS ENUM (
  'NOT_CONFIGURED', 'CONFIGURED_UNVERIFIED', 'CONNECTED', 'INVALID_CREDENTIALS',
  'ORGANIZATION_MISMATCH', 'INSUFFICIENT_ACCESS', 'RATE_LIMITED', 'UNAVAILABLE', 'DEGRADED'
);

CREATE TYPE "kelly_calendar"."ExternalSyncRunMode" AS ENUM ('DRY_RUN', 'APPLY');

CREATE TYPE "kelly_calendar"."ExternalSyncRunStatus" AS ENUM (
  'STARTED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
);

CREATE TYPE "kelly_calendar"."ExternalSyncCandidateAction" AS ENUM (
  'NEW_REMOTE', 'MATCHED_UNCHANGED', 'REMOTE_CHANGED', 'LOCAL_CHANGED',
  'BOTH_CHANGED', 'REMOTE_DELETED', 'AMBIGUOUS_MATCH', 'CONFLICT',
  'UNSUPPORTED', 'IGNORED'
);

CREATE TYPE "kelly_calendar"."ExternalSyncCandidateDisposition" AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'STALE', 'SKIPPED'
);

ALTER TABLE "kelly_calendar"."ExternalObjectReference"
  ADD COLUMN IF NOT EXISTS "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  ADD COLUMN IF NOT EXISTS "remoteCreatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "remoteDeletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "contentFingerprint" TEXT,
  ADD COLUMN IF NOT EXISTS "lastObservedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "kelly_calendar"."ExternalObjectReference_provider_objectType_externalObjectId_key";
CREATE UNIQUE INDEX "ExternalObjectReference_campaignScopeKey_provider_objectType_externalObjectId_key"
  ON "kelly_calendar"."ExternalObjectReference"("campaignScopeKey", "provider", "objectType", "externalObjectId");
CREATE INDEX IF NOT EXISTS "ExternalObjectReference_campaignScopeKey_provider_idx"
  ON "kelly_calendar"."ExternalObjectReference"("campaignScopeKey", "provider");

CREATE TABLE "kelly_calendar"."ExternalIntegrationConnection" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "provider" "kelly_calendar"."ExternalProvider" NOT NULL,
  "externalOrganizationId" TEXT NOT NULL,
  "organizationName" TEXT,
  "organizationSlug" TEXT,
  "status" "kelly_calendar"."ExternalIntegrationConnectionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "lastVerifiedAt" TIMESTAMP(3),
  "lastSuccessfulConnectionAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorCategory" TEXT,
  "lastErrorSummary" TEXT,
  "capabilityJson" JSONB NOT NULL DEFAULT '{}',
  "enabledImportScopesJson" JSONB NOT NULL DEFAULT '[]',
  "outboundWritesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalIntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalIntegrationConnection_campaignScopeKey_provider_externalOrganizationId_key"
  ON "kelly_calendar"."ExternalIntegrationConnection"("campaignScopeKey", "provider", "externalOrganizationId");
CREATE INDEX "ExternalIntegrationConnection_provider_status_idx"
  ON "kelly_calendar"."ExternalIntegrationConnection"("provider", "status");

CREATE TABLE "kelly_calendar"."ExternalSyncRun" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "provider" "kelly_calendar"."ExternalProvider" NOT NULL,
  "connectionId" TEXT,
  "direction" "kelly_calendar"."SyncDirection" NOT NULL DEFAULT 'IMPORT_ONLY',
  "objectScope" TEXT NOT NULL,
  "mode" "kelly_calendar"."ExternalSyncRunMode" NOT NULL DEFAULT 'DRY_RUN',
  "status" "kelly_calendar"."ExternalSyncRunStatus" NOT NULL DEFAULT 'STARTED',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "requestedByUserId" TEXT,
  "completedByUserId" TEXT,
  "cursorCheckpointJson" JSONB,
  "remoteExaminedCount" INTEGER NOT NULL DEFAULT 0,
  "createsProposed" INTEGER NOT NULL DEFAULT 0,
  "createsApplied" INTEGER NOT NULL DEFAULT 0,
  "updatesProposed" INTEGER NOT NULL DEFAULT 0,
  "updatesApplied" INTEGER NOT NULL DEFAULT 0,
  "unchangedCount" INTEGER NOT NULL DEFAULT 0,
  "conflictCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "rateLimitObserved" BOOLEAN NOT NULL DEFAULT false,
  "diagnosticSummary" TEXT,
  "documentationRevision" TEXT,
  "adapterVersion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExternalSyncRun_campaignScopeKey_provider_startedAt_idx"
  ON "kelly_calendar"."ExternalSyncRun"("campaignScopeKey", "provider", "startedAt");
CREATE INDEX "ExternalSyncRun_status_idx" ON "kelly_calendar"."ExternalSyncRun"("status");
CREATE INDEX "ExternalSyncRun_mode_idx" ON "kelly_calendar"."ExternalSyncRun"("mode");

ALTER TABLE "kelly_calendar"."ExternalSyncRun"
  ADD CONSTRAINT "ExternalSyncRun_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "kelly_calendar"."ExternalIntegrationConnection"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."ExternalSyncCandidate" (
  "id" TEXT NOT NULL,
  "syncRunId" TEXT NOT NULL,
  "provider" "kelly_calendar"."ExternalProvider" NOT NULL,
  "externalObjectType" "kelly_calendar"."ExternalObjectType" NOT NULL,
  "externalObjectId" TEXT NOT NULL,
  "proposedLocalObjectType" TEXT,
  "proposedLocalObjectId" TEXT,
  "action" "kelly_calendar"."ExternalSyncCandidateAction" NOT NULL,
  "conflictState" "kelly_calendar"."ExternalConflictState" NOT NULL DEFAULT 'NONE',
  "comparisonFingerprint" TEXT,
  "changeSummary" TEXT,
  "disposition" "kelly_calendar"."ExternalSyncCandidateDisposition" NOT NULL DEFAULT 'PENDING',
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalSyncCandidate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExternalSyncCandidate_syncRunId_action_idx"
  ON "kelly_calendar"."ExternalSyncCandidate"("syncRunId", "action");
CREATE INDEX "ExternalSyncCandidate_syncRunId_disposition_idx"
  ON "kelly_calendar"."ExternalSyncCandidate"("syncRunId", "disposition");
CREATE INDEX "ExternalSyncCandidate_provider_externalObjectType_externalObjectId_idx"
  ON "kelly_calendar"."ExternalSyncCandidate"("provider", "externalObjectType", "externalObjectId");

ALTER TABLE "kelly_calendar"."ExternalSyncCandidate"
  ADD CONSTRAINT "ExternalSyncCandidate_syncRunId_fkey"
  FOREIGN KEY ("syncRunId") REFERENCES "kelly_calendar"."ExternalSyncRun"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."ExternalSyncCheckpoint" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "provider" "kelly_calendar"."ExternalProvider" NOT NULL,
  "scope" TEXT NOT NULL,
  "cursorToken" TEXT,
  "lastRemoteModifiedAt" TIMESTAMP(3),
  "lastCompletedRunId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalSyncCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalSyncCheckpoint_campaignScopeKey_provider_scope_key"
  ON "kelly_calendar"."ExternalSyncCheckpoint"("campaignScopeKey", "provider", "scope");
