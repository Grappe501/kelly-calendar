-- V2.1 Prepare Mode — MissionPreparation (1:1 with CampaignMission)
-- Owned schema only: kelly_calendar
-- Additive / non-destructive. Does not alter Event or CampaignMission scheduling.
-- Lazy create: no blank rows seeded for existing missions.

CREATE TYPE "kelly_calendar"."MissionPreparationReadiness" AS ENUM (
  'DRAFT',
  'NEEDS_ATTENTION',
  'READY'
);

CREATE TABLE "kelly_calendar"."MissionPreparation" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "briefingSummary" TEXT,
  "strategicPurpose" TEXT,
  "desiredImpression" TEXT,
  "keyMessage" TEXT,
  "openingApproach" TEXT,
  "closingApproach" TEXT,
  "questionsToAsk" JSONB NOT NULL DEFAULT '[]',
  "talkingPoints" JSONB NOT NULL DEFAULT '[]',
  "thingsToNotice" JSONB NOT NULL DEFAULT '[]',
  "sensitivities" JSONB NOT NULL DEFAULT '[]',
  "commitmentsToAvoid" JSONB NOT NULL DEFAULT '[]',
  "storiesOrExamples" JSONB NOT NULL DEFAULT '[]',
  "peopleBriefings" JSONB NOT NULL DEFAULT '[]',
  "organizationBriefings" JSONB NOT NULL DEFAULT '[]',
  "logisticsNotes" TEXT,
  "arrivalInstructions" TEXT,
  "parkingInstructions" TEXT,
  "entryContact" TEXT,
  "attireNotes" TEXT,
  "accessibilityNotes" TEXT,
  "travelNotes" TEXT,
  "lodgingNotes" TEXT,
  "materialsNeeded" JSONB NOT NULL DEFAULT '[]',
  "preparationTasks" JSONB NOT NULL DEFAULT '[]',
  "operatorNotes" TEXT,
  "readinessState" "kelly_calendar"."MissionPreparationReadiness" NOT NULL DEFAULT 'DRAFT',
  "markedReadyAt" TIMESTAMP(3),
  "markedReadyByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionPreparation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionPreparation_missionId_key"
  ON "kelly_calendar"."MissionPreparation"("missionId");

CREATE INDEX "MissionPreparation_readinessState_idx"
  ON "kelly_calendar"."MissionPreparation"("readinessState");

ALTER TABLE "kelly_calendar"."MissionPreparation"
  ADD CONSTRAINT "MissionPreparation_missionId_fkey"
  FOREIGN KEY ("missionId")
  REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
