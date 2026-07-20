-- V2.1 Debrief Mode — MissionDebrief (1:1 with CampaignMission)
-- Owned schema only: kelly_calendar
-- Additive / non-destructive. Lazy create — no fabricated rows for existing missions.

CREATE TYPE "kelly_calendar"."MissionDebriefStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'APPROVED'
);

CREATE TYPE "kelly_calendar"."MissionOutcomeAssessment" AS ENUM (
  'NOT_ASSESSED',
  'ACHIEVED',
  'PARTIALLY_ACHIEVED',
  'NOT_ACHIEVED',
  'INCONCLUSIVE'
);

CREATE TABLE "kelly_calendar"."MissionDebrief" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "debriefStatus" "kelly_calendar"."MissionDebriefStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "outcomeAssessment" "kelly_calendar"."MissionOutcomeAssessment" NOT NULL DEFAULT 'NOT_ASSESSED',
  "outcomeSummary" TEXT,
  "criterionAssessments" JSONB NOT NULL DEFAULT '[]',
  "peopleOutcomes" JSONB NOT NULL DEFAULT '[]',
  "organizationOutcomes" JSONB NOT NULL DEFAULT '[]',
  "commitmentReviews" JSONB NOT NULL DEFAULT '[]',
  "followUpReviews" JSONB NOT NULL DEFAULT '[]',
  "whatWorked" JSONB NOT NULL DEFAULT '[]',
  "whatDidNotWork" JSONB NOT NULL DEFAULT '[]',
  "lessonsLearned" JSONB NOT NULL DEFAULT '[]',
  "strategicInsights" JSONB NOT NULL DEFAULT '[]',
  "unresolvedQuestions" JSONB NOT NULL DEFAULT '[]',
  "recommendedNextSteps" JSONB NOT NULL DEFAULT '[]',
  "internalNotes" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "startedByUserId" TEXT,
  "completedByUserId" TEXT,
  "approvedByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionDebrief_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionDebrief_missionId_key"
  ON "kelly_calendar"."MissionDebrief"("missionId");

CREATE INDEX "MissionDebrief_debriefStatus_idx"
  ON "kelly_calendar"."MissionDebrief"("debriefStatus");

CREATE INDEX "MissionDebrief_outcomeAssessment_idx"
  ON "kelly_calendar"."MissionDebrief"("outcomeAssessment");

ALTER TABLE "kelly_calendar"."MissionDebrief"
  ADD CONSTRAINT "MissionDebrief_missionId_fkey"
  FOREIGN KEY ("missionId")
  REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
