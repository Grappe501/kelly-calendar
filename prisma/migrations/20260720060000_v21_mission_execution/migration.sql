-- V2.1 Execute Mode — MissionExecution (1:1 with CampaignMission)
-- Owned schema only: kelly_calendar
-- Additive / non-destructive. Lazy create — no fabricated rows for existing missions.

CREATE TYPE "kelly_calendar"."MissionExecutionStatus" AS ENUM (
  'NOT_STARTED',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED'
);

CREATE TABLE "kelly_calendar"."MissionExecution" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "executionStatus" "kelly_calendar"."MissionExecutionStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "arrivedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "arrivalNote" TEXT,
  "liveObservations" JSONB NOT NULL DEFAULT '[]',
  "peopleContacts" JSONB NOT NULL DEFAULT '[]',
  "organizationContacts" JSONB NOT NULL DEFAULT '[]',
  "commitments" JSONB NOT NULL DEFAULT '[]',
  "immediateFollowUps" JSONB NOT NULL DEFAULT '[]',
  "fieldNotes" TEXT,
  "arrivedByUserId" TEXT,
  "startedByUserId" TEXT,
  "completedByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionExecution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionExecution_missionId_key"
  ON "kelly_calendar"."MissionExecution"("missionId");

CREATE INDEX "MissionExecution_executionStatus_idx"
  ON "kelly_calendar"."MissionExecution"("executionStatus");

ALTER TABLE "kelly_calendar"."MissionExecution"
  ADD CONSTRAINT "MissionExecution_missionId_fkey"
  FOREIGN KEY ("missionId")
  REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
