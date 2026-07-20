-- V2.1 Campaign Mission projection store
-- Owned schema only: kelly_calendar
-- Additive / non-destructive. Does not alter Event scheduling columns.
-- RedDirt impact: none

CREATE TYPE "kelly_calendar"."MissionLifecyclePhase" AS ENUM (
  'PREPARE',
  'TRAVEL',
  'EXECUTE',
  'DEBRIEF',
  'FOLLOW_UP',
  'COMPLETE'
);

CREATE TYPE "kelly_calendar"."MissionOperationalStatus" AS ENUM (
  'DRAFT',
  'PREPARING',
  'READY',
  'IN_PROGRESS',
  'DEBRIEFING',
  'FOLLOW_UP',
  'COMPLETE',
  'CANCELLED',
  'ARCHIVED'
);

CREATE TABLE "kelly_calendar"."CampaignMission" (
  "id" TEXT NOT NULL,
  "sourceEventId" TEXT NOT NULL,
  "sourceEventNumber" TEXT NOT NULL,
  "sourceEventVersion" INTEGER NOT NULL,
  "projectionVersion" TEXT NOT NULL DEFAULT 'v2.1.0',
  "attendTitle" TEXT NOT NULL,
  "objective" TEXT,
  "objectiveSource" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "successCriteria" JSONB NOT NULL,
  "missionStatus" "kelly_calendar"."MissionOperationalStatus" NOT NULL DEFAULT 'DRAFT',
  "lifecyclePhase" "kelly_calendar"."MissionLifecyclePhase" NOT NULL DEFAULT 'PREPARE',
  "intelligence" JSONB NOT NULL,
  "completeness" JSONB NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
  "operatorOwnedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "projectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignMission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignMission_sourceEventId_key"
  ON "kelly_calendar"."CampaignMission"("sourceEventId");

CREATE INDEX "CampaignMission_missionStatus_idx"
  ON "kelly_calendar"."CampaignMission"("missionStatus");

CREATE INDEX "CampaignMission_lifecyclePhase_idx"
  ON "kelly_calendar"."CampaignMission"("lifecyclePhase");

CREATE INDEX "CampaignMission_startsAt_endsAt_idx"
  ON "kelly_calendar"."CampaignMission"("startsAt", "endsAt");

CREATE INDEX "CampaignMission_sourceEventNumber_idx"
  ON "kelly_calendar"."CampaignMission"("sourceEventNumber");

ALTER TABLE "kelly_calendar"."CampaignMission"
  ADD CONSTRAINT "CampaignMission_sourceEventId_fkey"
  FOREIGN KEY ("sourceEventId")
  REFERENCES "kelly_calendar"."Event"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
