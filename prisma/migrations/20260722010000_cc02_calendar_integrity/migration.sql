-- CC-02 Calendar Integrity & Provenance Console

CREATE TYPE "kelly_calendar"."CalendarIntegrityScanStatus" AS ENUM (
  'STARTED',
  'COMPLETED',
  'PARTIAL',
  'FAILED'
);

CREATE TYPE "kelly_calendar"."CalendarIntegrityFindingState" AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'ACCEPTED_RISK',
  'RESOLVED',
  'NOT_APPLICABLE',
  'STALE'
);

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CalendarIntegrityScan" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "scope" TEXT NOT NULL,
  "rangeStart" TIMESTAMP(3),
  "rangeEnd" TIMESTAMP(3),
  "sourceId" TEXT,
  "importRunId" TEXT,
  "eventId" TEXT,
  "detectorVersion" TEXT NOT NULL,
  "status" "kelly_calendar"."CalendarIntegrityScanStatus" NOT NULL DEFAULT 'STARTED',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "requestedByUserId" TEXT,
  "eventsExamined" INTEGER NOT NULL DEFAULT 0,
  "findingsTotal" INTEGER NOT NULL DEFAULT 0,
  "findingsBySeverity" JSONB,
  "findingsByType" JSONB,
  "truncated" BOOLEAN NOT NULL DEFAULT false,
  "truncationNote" TEXT,
  "errorSummaryRedacted" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarIntegrityScan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalendarIntegrityScan_campaignKey_startedAt_idx"
  ON "kelly_calendar"."CalendarIntegrityScan"("campaignKey", "startedAt");
CREATE INDEX IF NOT EXISTS "CalendarIntegrityScan_status_idx"
  ON "kelly_calendar"."CalendarIntegrityScan"("status");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CalendarIntegrityFinding" (
  "id" TEXT NOT NULL,
  "scanId" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "findingKey" TEXT NOT NULL,
  "findingType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "evidenceJson" JSONB NOT NULL,
  "primaryEventId" TEXT,
  "relatedEventIds" TEXT[],
  "externalSourceId" TEXT,
  "externalIdentityId" TEXT,
  "importRunId" TEXT,
  "importRecordId" TEXT,
  "detectionVersion" TEXT NOT NULL,
  "state" "kelly_calendar"."CalendarIntegrityFindingState" NOT NULL DEFAULT 'OPEN',
  "repairAvailable" BOOLEAN NOT NULL DEFAULT false,
  "firstObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "staleAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarIntegrityFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalendarIntegrityFinding_scanId_idx"
  ON "kelly_calendar"."CalendarIntegrityFinding"("scanId");
CREATE INDEX IF NOT EXISTS "CalendarIntegrityFinding_findingKey_idx"
  ON "kelly_calendar"."CalendarIntegrityFinding"("findingKey");
CREATE INDEX IF NOT EXISTS "CalendarIntegrityFinding_findingType_severity_idx"
  ON "kelly_calendar"."CalendarIntegrityFinding"("findingType", "severity");
CREATE INDEX IF NOT EXISTS "CalendarIntegrityFinding_state_idx"
  ON "kelly_calendar"."CalendarIntegrityFinding"("state");
CREATE INDEX IF NOT EXISTS "CalendarIntegrityFinding_primaryEventId_idx"
  ON "kelly_calendar"."CalendarIntegrityFinding"("primaryEventId");

ALTER TABLE "kelly_calendar"."CalendarIntegrityFinding"
  ADD CONSTRAINT "CalendarIntegrityFinding_scanId_fkey"
  FOREIGN KEY ("scanId") REFERENCES "kelly_calendar"."CalendarIntegrityScan"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CalendarIntegrityDisposition" (
  "id" TEXT NOT NULL,
  "findingId" TEXT NOT NULL,
  "findingKey" TEXT NOT NULL,
  "disposition" TEXT NOT NULL,
  "reason" TEXT,
  "actorUserId" TEXT,
  "evidenceFingerprint" TEXT,
  "superseded" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarIntegrityDisposition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalendarIntegrityDisposition_findingId_idx"
  ON "kelly_calendar"."CalendarIntegrityDisposition"("findingId");
CREATE INDEX IF NOT EXISTS "CalendarIntegrityDisposition_findingKey_idx"
  ON "kelly_calendar"."CalendarIntegrityDisposition"("findingKey");

ALTER TABLE "kelly_calendar"."CalendarIntegrityDisposition"
  ADD CONSTRAINT "CalendarIntegrityDisposition_findingId_fkey"
  FOREIGN KEY ("findingId") REFERENCES "kelly_calendar"."CalendarIntegrityFinding"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CalendarIntegrityRepairAttempt" (
  "id" TEXT NOT NULL,
  "findingId" TEXT NOT NULL,
  "repairType" TEXT NOT NULL,
  "previewFingerprint" TEXT,
  "requestedByUserId" TEXT,
  "confirmedByUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PREVIEWED',
  "affectedRecordIds" TEXT[],
  "auditRef" TEXT,
  "errorClass" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarIntegrityRepairAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CalendarIntegrityRepairAttempt_findingId_idx"
  ON "kelly_calendar"."CalendarIntegrityRepairAttempt"("findingId");

ALTER TABLE "kelly_calendar"."CalendarIntegrityRepairAttempt"
  ADD CONSTRAINT "CalendarIntegrityRepairAttempt_findingId_fkey"
  FOREIGN KEY ("findingId") REFERENCES "kelly_calendar"."CalendarIntegrityFinding"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
