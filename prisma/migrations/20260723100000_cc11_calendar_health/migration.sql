-- CC-11: Calendar Health Dashboard & Forensic Automation (observe/explain only).
-- Forward-only additive. Does not mutate Events, Missions, conflicts, availability, or feeds.

CREATE TYPE "kelly_calendar"."CalendarHealthRunStatus" AS ENUM (
  'STARTED',
  'RUNNING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "kelly_calendar"."CalendarHealthOverallState" AS ENUM (
  'HEALTHY',
  'DEGRADED',
  'UNHEALTHY',
  'UNKNOWN',
  'PARTIAL',
  'NOT_CONFIGURED'
);

CREATE TYPE "kelly_calendar"."CalendarHealthRunType" AS ENUM (
  'MANUAL',
  'SCHEDULED',
  'FOCUSED'
);

CREATE TYPE "kelly_calendar"."CalendarHealthAlertStatus" AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED',
  'SUPPRESSED',
  'STALE'
);

CREATE TABLE "kelly_calendar"."CalendarHealthRun" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "runType" "kelly_calendar"."CalendarHealthRunType" NOT NULL,
  "scope" TEXT NOT NULL,
  "domainsJson" JSONB NOT NULL,
  "detectorVersion" TEXT NOT NULL,
  "status" "kelly_calendar"."CalendarHealthRunStatus" NOT NULL DEFAULT 'STARTED',
  "overallState" "kelly_calendar"."CalendarHealthOverallState" NOT NULL DEFAULT 'UNKNOWN',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  "requestedByUserId" TEXT,
  "systemJobId" TEXT,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "mandatoryExpected" INTEGER NOT NULL DEFAULT 0,
  "mandatoryCompleted" INTEGER NOT NULL DEFAULT 0,
  "mandatoryFailed" INTEGER NOT NULL DEFAULT 0,
  "mandatorySkipped" INTEGER NOT NULL DEFAULT 0,
  "recordsExamined" INTEGER NOT NULL DEFAULT 0,
  "findingsBySeverity" JSONB,
  "findingsByDomain" JSONB,
  "truncated" BOOLEAN NOT NULL DEFAULT false,
  "truncationNote" TEXT,
  "previousComparableRunId" TEXT,
  "resultFingerprint" TEXT,
  "errorSummaryRedacted" TEXT,
  "configState" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarHealthRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalendarHealthRun_campaignKey_startedAt_idx"
  ON "kelly_calendar"."CalendarHealthRun"("campaignKey", "startedAt");
CREATE INDEX "CalendarHealthRun_status_idx"
  ON "kelly_calendar"."CalendarHealthRun"("status");
CREATE INDEX "CalendarHealthRun_overallState_idx"
  ON "kelly_calendar"."CalendarHealthRun"("overallState");
CREATE INDEX "CalendarHealthRun_systemJobId_idx"
  ON "kelly_calendar"."CalendarHealthRun"("systemJobId");
CREATE INDEX "CalendarHealthRun_leaseExpiresAt_idx"
  ON "kelly_calendar"."CalendarHealthRun"("leaseExpiresAt");

CREATE TABLE "kelly_calendar"."CalendarHealthFinding" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "domain" TEXT NOT NULL,
  "findingKey" TEXT NOT NULL,
  "findingType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "certainty" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "summary" TEXT NOT NULL,
  "evidenceFingerprint" TEXT NOT NULL,
  "relatedRefType" TEXT,
  "relatedRefId" TEXT,
  "integrityFindingId" TEXT,
  "trend" TEXT,
  "firstObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarHealthFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalendarHealthFinding_runId_idx"
  ON "kelly_calendar"."CalendarHealthFinding"("runId");
CREATE INDEX "CalendarHealthFinding_campaignKey_findingKey_idx"
  ON "kelly_calendar"."CalendarHealthFinding"("campaignKey", "findingKey");
CREATE INDEX "CalendarHealthFinding_domain_severity_idx"
  ON "kelly_calendar"."CalendarHealthFinding"("domain", "severity");
CREATE INDEX "CalendarHealthFinding_status_idx"
  ON "kelly_calendar"."CalendarHealthFinding"("status");
CREATE INDEX "CalendarHealthFinding_relatedRefType_relatedRefId_idx"
  ON "kelly_calendar"."CalendarHealthFinding"("relatedRefType", "relatedRefId");
CREATE INDEX "CalendarHealthFinding_integrityFindingId_idx"
  ON "kelly_calendar"."CalendarHealthFinding"("integrityFindingId");

ALTER TABLE "kelly_calendar"."CalendarHealthFinding"
  ADD CONSTRAINT "CalendarHealthFinding_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "kelly_calendar"."CalendarHealthRun"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."CalendarHealthAlert" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "findingKey" TEXT NOT NULL,
  "alertType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" "kelly_calendar"."CalendarHealthAlertStatus" NOT NULL DEFAULT 'OPEN',
  "summary" TEXT NOT NULL,
  "firstTriggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastTriggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedByUserId" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "suppressedUntil" TIMESTAMP(3),
  "suppressionReason" TEXT,
  "escalationState" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarHealthAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarHealthAlert_campaignKey_findingKey_key"
  ON "kelly_calendar"."CalendarHealthAlert"("campaignKey", "findingKey");
CREATE INDEX "CalendarHealthAlert_campaignKey_status_idx"
  ON "kelly_calendar"."CalendarHealthAlert"("campaignKey", "status");
CREATE INDEX "CalendarHealthAlert_severity_idx"
  ON "kelly_calendar"."CalendarHealthAlert"("severity");
CREATE INDEX "CalendarHealthAlert_lastTriggeredAt_idx"
  ON "kelly_calendar"."CalendarHealthAlert"("lastTriggeredAt");

CREATE TABLE "kelly_calendar"."CalendarHealthCheckpoint" (
  "id" TEXT NOT NULL,
  "campaignKey" TEXT NOT NULL DEFAULT 'kelly',
  "checkpointKey" TEXT NOT NULL,
  "lastSuccessfulRunId" TEXT,
  "lastCompleteRunId" TEXT,
  "lastAttemptedRunId" TEXT,
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "nextExpectedAt" TIMESTAMP(3),
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarHealthCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarHealthCheckpoint_campaignKey_checkpointKey_key"
  ON "kelly_calendar"."CalendarHealthCheckpoint"("campaignKey", "checkpointKey");
CREATE INDEX "CalendarHealthCheckpoint_nextExpectedAt_idx"
  ON "kelly_calendar"."CalendarHealthCheckpoint"("nextExpectedAt");
