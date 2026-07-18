-- Step 5.5 operational intelligence persistence
-- Owned schema only: kelly_calendar
-- RedDirt impact: none

-- Extend EventPatternSignal for pattern engine
ALTER TABLE "kelly_calendar"."EventPatternSignal"
  ADD COLUMN IF NOT EXISTS "patternType" TEXT,
  ADD COLUMN IF NOT EXISTS "scopeType" TEXT DEFAULT 'GLOBAL',
  ADD COLUMN IF NOT EXISTS "scopeKey" TEXT,
  ADD COLUMN IF NOT EXISTS "sampleSize" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dateRangeStart" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dateRangeEnd" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "evidenceSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "calculationVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "EventPatternSignal_patternType_scopeType_scopeKey_idx"
  ON "kelly_calendar"."EventPatternSignal"("patternType", "scopeType", "scopeKey");

CREATE TABLE "kelly_calendar"."EventWorkflowApplication" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "workflowVersion" INTEGER NOT NULL,
    "applicationMode" TEXT NOT NULL,
    "appliedByUserId" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedSummary" JSONB,
    "sourceEventVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventWorkflowApplication_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EventWorkflowApplication_workflowVersion_positive"
      CHECK ("workflowVersion" > 0)
);

CREATE TABLE "kelly_calendar"."EventReadinessSnapshot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL,
    "calculationVersion" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "readinessLevel" TEXT NOT NULL,
    "domainScores" JSONB NOT NULL,
    "criticalBlockers" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventReadinessSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EventReadinessSnapshot_score_range"
      CHECK ("overallScore" >= 0 AND "overallScore" <= 100),
    CONSTRAINT "EventReadinessSnapshot_version_positive"
      CHECK ("eventVersion" > 0)
);

CREATE TABLE "kelly_calendar"."OperationalRecommendationRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "recommendationKey" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "priority" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldPath" TEXT,
    "proposedValue" JSONB,
    "reasons" JSONB NOT NULL,
    "evidence" JSONB,
    "requiresHumanApproval" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "eventVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OperationalRecommendationRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OperationalRecommendationRecord_confidence_range"
      CHECK ("confidence" >= 0 AND "confidence" <= 1)
);

CREATE TABLE "kelly_calendar"."OperationalRecommendationDecision" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedValue" JSONB,
    "reason" TEXT,
    "eventVersion" INTEGER,
    CONSTRAINT "OperationalRecommendationDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kelly_calendar"."OperationalConflictRecord" (
    "id" TEXT NOT NULL,
    "conflictKey" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "primaryEntityType" TEXT NOT NULL,
    "primaryEntityId" TEXT NOT NULL,
    "primaryLabel" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "relatedLabel" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "explanation" TEXT NOT NULL,
    "evidence" JSONB,
    "suggestedResolutions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "automaticallyResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OperationalConflictRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kelly_calendar"."OperationalConflictAction" (
    "id" TEXT NOT NULL,
    "conflictId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationalConflictAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationalConflictRecord_conflictKey_key"
  ON "kelly_calendar"."OperationalConflictRecord"("conflictKey");

CREATE INDEX "EventWorkflowApplication_eventId_idx"
  ON "kelly_calendar"."EventWorkflowApplication"("eventId");
CREATE INDEX "EventWorkflowApplication_workflowDefinitionId_workflowVersion_idx"
  ON "kelly_calendar"."EventWorkflowApplication"("workflowDefinitionId", "workflowVersion");
CREATE INDEX "EventReadinessSnapshot_eventId_calculatedAt_idx"
  ON "kelly_calendar"."EventReadinessSnapshot"("eventId", "calculatedAt");
CREATE INDEX "OperationalRecommendationRecord_eventId_status_idx"
  ON "kelly_calendar"."OperationalRecommendationRecord"("eventId", "status");
CREATE INDEX "OperationalRecommendationRecord_recommendationKey_idx"
  ON "kelly_calendar"."OperationalRecommendationRecord"("recommendationKey");
CREATE INDEX "OperationalRecommendationDecision_recommendationId_idx"
  ON "kelly_calendar"."OperationalRecommendationDecision"("recommendationId");
CREATE INDEX "OperationalConflictRecord_severity_status_idx"
  ON "kelly_calendar"."OperationalConflictRecord"("severity", "status");
CREATE INDEX "OperationalConflictAction_conflictId_idx"
  ON "kelly_calendar"."OperationalConflictAction"("conflictId");

ALTER TABLE "kelly_calendar"."EventWorkflowApplication"
  ADD CONSTRAINT "EventWorkflowApplication_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."EventReadinessSnapshot"
  ADD CONSTRAINT "EventReadinessSnapshot_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."OperationalRecommendationRecord"
  ADD CONSTRAINT "OperationalRecommendationRecord_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."OperationalRecommendationDecision"
  ADD CONSTRAINT "OperationalRecommendationDecision_recommendationId_fkey"
  FOREIGN KEY ("recommendationId") REFERENCES "kelly_calendar"."OperationalRecommendationRecord"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "kelly_calendar"."OperationalConflictAction"
  ADD CONSTRAINT "OperationalConflictAction_conflictId_fkey"
  FOREIGN KEY ("conflictId") REFERENCES "kelly_calendar"."OperationalConflictRecord"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
