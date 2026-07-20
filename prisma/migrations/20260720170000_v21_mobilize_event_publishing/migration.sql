-- V2.1 Mobilize Event Publishing (D17)
-- Additive. Credentials never stored. Delete disabled by default at app layer.
-- Owned schema: kelly_calendar

CREATE TYPE "kelly_calendar"."ExternalPublicationStatus" AS ENUM (
  'DRAFT', 'PREVIEWED', 'AWAITING_APPROVAL', 'APPROVED', 'PUBLISHING', 'PUBLISHED',
  'LOCALLY_CHANGED', 'REMOTELY_CHANGED', 'CONFLICT', 'REMOTE_DELETED',
  'UNKNOWN_REMOTE_OUTCOME', 'FAILED', 'RECONCILED', 'CANCELLED_LOCAL'
);

CREATE TYPE "kelly_calendar"."ExternalPublicationRemoteOutcome" AS ENUM (
  'NONE', 'SUCCESS', 'FAILED', 'UNKNOWN', 'RECONCILED'
);

CREATE TYPE "kelly_calendar"."ExternalPublicationActionType" AS ENUM (
  'CREATE', 'UPDATE', 'DELETE', 'REFRESH'
);

CREATE TYPE "kelly_calendar"."ExternalPublicationApprovalState" AS ENUM (
  'ACTIVE', 'CONSUMED', 'EXPIRED', 'SUPERSEDED', 'REVOKED'
);

CREATE TYPE "kelly_calendar"."ExternalPublicationAttemptStatus" AS ENUM (
  'STARTED', 'SUCCEEDED', 'FAILED', 'UNKNOWN_OUTCOME', 'CANCELLED'
);

CREATE TABLE "kelly_calendar"."ExternalPublication" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "provider" "kelly_calendar"."ExternalProvider" NOT NULL DEFAULT 'MOBILIZE',
  "localObjectType" TEXT NOT NULL DEFAULT 'Event',
  "localObjectId" TEXT NOT NULL,
  "externalObjectReferenceId" TEXT,
  "status" "kelly_calendar"."ExternalPublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "targetOrganizationId" TEXT,
  "mappingVersion" TEXT NOT NULL,
  "localFingerprint" TEXT,
  "proposedPayloadFingerprint" TEXT,
  "lastSyncedBaseFingerprint" TEXT,
  "remoteFingerprint" TEXT,
  "lastPublishedAt" TIMESTAMP(3),
  "lastUpdatedAtRemote" TIMESTAMP(3),
  "lastSuccessfulActorUserId" TEXT,
  "conflictState" "kelly_calendar"."ExternalConflictState" NOT NULL DEFAULT 'NONE',
  "remoteOutcome" "kelly_calendar"."ExternalPublicationRemoteOutcome" NOT NULL DEFAULT 'NONE',
  "mobilizeBrowserUrl" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalPublication_campaignScopeKey_provider_localObjectType_localObjectId_key"
  ON "kelly_calendar"."ExternalPublication"("campaignScopeKey", "provider", "localObjectType", "localObjectId");
CREATE INDEX "ExternalPublication_status_idx" ON "kelly_calendar"."ExternalPublication"("status");
CREATE INDEX "ExternalPublication_provider_targetOrganizationId_idx"
  ON "kelly_calendar"."ExternalPublication"("provider", "targetOrganizationId");

CREATE TABLE "kelly_calendar"."ExternalPublicationApproval" (
  "id" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "actionType" "kelly_calendar"."ExternalPublicationActionType" NOT NULL,
  "localFingerprint" TEXT NOT NULL,
  "payloadFingerprint" TEXT NOT NULL,
  "mappingVersion" TEXT NOT NULL,
  "targetOrganizationId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "state" "kelly_calendar"."ExternalPublicationApprovalState" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalPublicationApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExternalPublicationApproval_publicationId_state_idx"
  ON "kelly_calendar"."ExternalPublicationApproval"("publicationId", "state");
CREATE INDEX "ExternalPublicationApproval_payloadFingerprint_idx"
  ON "kelly_calendar"."ExternalPublicationApproval"("payloadFingerprint");

ALTER TABLE "kelly_calendar"."ExternalPublicationApproval"
  ADD CONSTRAINT "ExternalPublicationApproval_publicationId_fkey"
  FOREIGN KEY ("publicationId") REFERENCES "kelly_calendar"."ExternalPublication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."ExternalPublicationAttempt" (
  "id" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "syncRunId" TEXT,
  "actionType" "kelly_calendar"."ExternalPublicationActionType" NOT NULL,
  "status" "kelly_calendar"."ExternalPublicationAttemptStatus" NOT NULL DEFAULT 'STARTED',
  "requestCorrelationId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "responseClass" TEXT,
  "remoteObjectId" TEXT,
  "errorCategory" TEXT,
  "unknownOutcome" BOOLEAN NOT NULL DEFAULT false,
  "actorUserId" TEXT,
  "mappingVersion" TEXT NOT NULL,
  "redactedSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalPublicationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalPublicationAttempt_idempotencyKey_key"
  ON "kelly_calendar"."ExternalPublicationAttempt"("idempotencyKey");
CREATE INDEX "ExternalPublicationAttempt_publicationId_startedAt_idx"
  ON "kelly_calendar"."ExternalPublicationAttempt"("publicationId", "startedAt");
CREATE INDEX "ExternalPublicationAttempt_status_idx"
  ON "kelly_calendar"."ExternalPublicationAttempt"("status");

ALTER TABLE "kelly_calendar"."ExternalPublicationAttempt"
  ADD CONSTRAINT "ExternalPublicationAttempt_publicationId_fkey"
  FOREIGN KEY ("publicationId") REFERENCES "kelly_calendar"."ExternalPublication"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
