-- CC-09: durable bulk operation preview/execute/recovery records.
-- Forward-only additive. Does not rewrite Events or Missions.

CREATE TYPE "kelly_calendar"."CalendarBulkActionType" AS ENUM (
  'ARCHIVE', 'RESTORE', 'CANCEL', 'ADD_CALENDAR', 'REMOVE_CALENDAR'
);
CREATE TYPE "kelly_calendar"."CalendarBulkOperationStatus" AS ENUM (
  'PREVIEW', 'CONFIRMED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'
);
CREATE TYPE "kelly_calendar"."CalendarBulkItemEligibility" AS ENUM (
  'ELIGIBLE', 'INELIGIBLE', 'ALREADY_COMPLETE', 'REQUIRES_INDIVIDUAL_REVIEW', 'STALE', 'UNAUTHORIZED'
);
CREATE TYPE "kelly_calendar"."CalendarBulkItemResult" AS ENUM (
  'PENDING', 'SUCCEEDED', 'SKIPPED', 'FAILED', 'STALE'
);
CREATE TYPE "kelly_calendar"."CalendarBulkRecoveryState" AS ENUM (
  'NONE', 'AVAILABLE', 'PREVIEWED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'BLOCKED'
);

CREATE TABLE "kelly_calendar"."CalendarBulkOperation" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "actionType" "kelly_calendar"."CalendarBulkActionType" NOT NULL,
  "status" "kelly_calendar"."CalendarBulkOperationStatus" NOT NULL DEFAULT 'PREVIEW',
  "selectionMode" TEXT NOT NULL DEFAULT 'EXPLICIT_IDS',
  "querySnapshotJson" JSONB,
  "previewFingerprint" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "targetCalendarId" TEXT,
  "reason" TEXT,
  "requestedByUserId" TEXT NOT NULL,
  "confirmedByUserId" TEXT,
  "previewExpiresAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "eligibleCount" INTEGER NOT NULL DEFAULT 0,
  "alreadyCompleteCount" INTEGER NOT NULL DEFAULT 0,
  "ineligibleCount" INTEGER NOT NULL DEFAULT 0,
  "reviewRequiredCount" INTEGER NOT NULL DEFAULT 0,
  "succeededCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "staleCount" INTEGER NOT NULL DEFAULT 0,
  "truncated" BOOLEAN NOT NULL DEFAULT false,
  "recoveryState" "kelly_calendar"."CalendarBulkRecoveryState" NOT NULL DEFAULT 'NONE',
  "recoveryFingerprint" TEXT,
  "errorSummaryRedacted" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarBulkOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarBulkOperation_idempotencyKey_key"
  ON "kelly_calendar"."CalendarBulkOperation"("idempotencyKey");
CREATE INDEX "CalendarBulkOperation_campaignKey_createdAt_idx"
  ON "kelly_calendar"."CalendarBulkOperation"("campaignKey", "createdAt");
CREATE INDEX "CalendarBulkOperation_status_idx"
  ON "kelly_calendar"."CalendarBulkOperation"("status");
CREATE INDEX "CalendarBulkOperation_requestedByUserId_idx"
  ON "kelly_calendar"."CalendarBulkOperation"("requestedByUserId");

CREATE TABLE "kelly_calendar"."CalendarBulkOperationItem" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "recurrenceSeriesId" TEXT,
  "occurrenceKey" TEXT,
  "fingerprintAtPreview" TEXT NOT NULL,
  "fingerprintAtExecution" TEXT,
  "eligibility" "kelly_calendar"."CalendarBulkItemEligibility" NOT NULL,
  "result" "kelly_calendar"."CalendarBulkItemResult" NOT NULL DEFAULT 'PENDING',
  "missionLinked" BOOLEAN NOT NULL DEFAULT false,
  "isImported" BOOLEAN NOT NULL DEFAULT false,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "classificationNote" TEXT,
  "errorClassification" TEXT,
  "recoveryEligible" BOOLEAN NOT NULL DEFAULT false,
  "beforeStatus" TEXT,
  "afterStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarBulkOperationItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarBulkOperationItem_operationId_eventId_key"
  ON "kelly_calendar"."CalendarBulkOperationItem"("operationId", "eventId");
CREATE INDEX "CalendarBulkOperationItem_eventId_idx"
  ON "kelly_calendar"."CalendarBulkOperationItem"("eventId");
CREATE INDEX "CalendarBulkOperationItem_result_idx"
  ON "kelly_calendar"."CalendarBulkOperationItem"("result");

ALTER TABLE "kelly_calendar"."CalendarBulkOperationItem"
  ADD CONSTRAINT "CalendarBulkOperationItem_operationId_fkey"
  FOREIGN KEY ("operationId") REFERENCES "kelly_calendar"."CalendarBulkOperation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kelly_calendar"."CalendarBulkOperationItem"
  ADD CONSTRAINT "CalendarBulkOperationItem_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CalendarRecoveryAction" (
  "id" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "recoveryAction" "kelly_calendar"."CalendarBulkActionType" NOT NULL,
  "previewFingerprint" TEXT NOT NULL,
  "status" "kelly_calendar"."CalendarBulkOperationStatus" NOT NULL DEFAULT 'PREVIEW',
  "requestedByUserId" TEXT NOT NULL,
  "confirmedByUserId" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "succeededCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "resultSummaryJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarRecoveryAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalendarRecoveryAction_operationId_idx"
  ON "kelly_calendar"."CalendarRecoveryAction"("operationId");

ALTER TABLE "kelly_calendar"."CalendarRecoveryAction"
  ADD CONSTRAINT "CalendarRecoveryAction_operationId_fkey"
  FOREIGN KEY ("operationId") REFERENCES "kelly_calendar"."CalendarBulkOperation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
