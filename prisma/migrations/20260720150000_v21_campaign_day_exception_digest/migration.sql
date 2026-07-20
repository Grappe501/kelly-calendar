-- V2.1 Campaign Day Exception Digest + provider-neutral external reference foundation
-- Owned schema: kelly_calendar
-- Additive / non-destructive. Lazy create — zero fabricated digest or sync rows.
-- Mobilize: enum + ExternalObjectReference only — no network calls, no secrets.

ALTER TYPE "kelly_calendar"."ExternalProvider" ADD VALUE IF NOT EXISTS 'MOBILIZE';

CREATE TYPE "kelly_calendar"."ExternalObjectType" AS ENUM (
  'EVENT', 'TIMESLOT', 'SHIFT', 'SIGNUP', 'ATTENDANCE',
  'PERSON', 'ORGANIZATION', 'OTHER'
);

CREATE TYPE "kelly_calendar"."ExternalSyncProvenance" AS ENUM (
  'MANUAL', 'POLL', 'WEBHOOK', 'IMPORT', 'PUBLISH', 'RECONCILE', 'UNKNOWN'
);

CREATE TYPE "kelly_calendar"."ExternalConflictState" AS ENUM (
  'NONE', 'DETECTED', 'RESOLVED_LOCAL', 'RESOLVED_REMOTE', 'MANUAL_REQUIRED'
);

CREATE TYPE "kelly_calendar"."CampaignDayIncidentDigestReviewStatus" AS ENUM (
  'DRAFT', 'REVIEWED', 'STALE'
);

CREATE TABLE "kelly_calendar"."CampaignDayIncidentDigestReview" (
  "id" TEXT NOT NULL,
  "campaignDateKey" TEXT NOT NULL,
  "status" "kelly_calendar"."CampaignDayIncidentDigestReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "note" TEXT,
  "sourceFingerprint" TEXT NOT NULL,
  "staleAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignDayIncidentDigestReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignDayIncidentDigestReview_campaignDateKey_key"
  ON "kelly_calendar"."CampaignDayIncidentDigestReview"("campaignDateKey");
CREATE INDEX "CampaignDayIncidentDigestReview_status_idx"
  ON "kelly_calendar"."CampaignDayIncidentDigestReview"("status");
CREATE INDEX "CampaignDayIncidentDigestReview_campaignDateKey_status_idx"
  ON "kelly_calendar"."CampaignDayIncidentDigestReview"("campaignDateKey", "status");

CREATE TABLE "kelly_calendar"."ExternalObjectReference" (
  "id" TEXT NOT NULL,
  "provider" "kelly_calendar"."ExternalProvider" NOT NULL,
  "objectType" "kelly_calendar"."ExternalObjectType" NOT NULL,
  "externalObjectId" TEXT NOT NULL,
  "localObjectType" TEXT,
  "localObjectId" TEXT,
  "remoteVersion" TEXT,
  "remoteUpdatedAt" TIMESTAMP(3),
  "lastSuccessfulSyncAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "syncDirection" "kelly_calendar"."SyncDirection" NOT NULL DEFAULT 'NONE',
  "syncStatus" "kelly_calendar"."SyncStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "provenance" "kelly_calendar"."ExternalSyncProvenance" NOT NULL DEFAULT 'UNKNOWN',
  "conflictState" "kelly_calendar"."ExternalConflictState" NOT NULL DEFAULT 'NONE',
  "idempotencyKey" TEXT,
  "lastErrorCode" TEXT,
  "lastErrorSummary" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "ExternalObjectReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalObjectReference_provider_objectType_externalObjectId_key"
  ON "kelly_calendar"."ExternalObjectReference"("provider", "objectType", "externalObjectId");
CREATE UNIQUE INDEX "ExternalObjectReference_provider_idempotencyKey_key"
  ON "kelly_calendar"."ExternalObjectReference"("provider", "idempotencyKey");
CREATE INDEX "ExternalObjectReference_provider_syncStatus_idx"
  ON "kelly_calendar"."ExternalObjectReference"("provider", "syncStatus");
CREATE INDEX "ExternalObjectReference_localObjectType_localObjectId_idx"
  ON "kelly_calendar"."ExternalObjectReference"("localObjectType", "localObjectId");
CREATE INDEX "ExternalObjectReference_conflictState_idx"
  ON "kelly_calendar"."ExternalObjectReference"("conflictState");
