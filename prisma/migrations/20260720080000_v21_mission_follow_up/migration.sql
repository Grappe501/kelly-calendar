-- V2.1 Follow-up Mode — MissionFollowUp + MissionFollowUpAction
-- Owned schema only: kelly_calendar
-- Additive / non-destructive. Lazy create — no fabricated rows for existing missions.

CREATE TYPE "kelly_calendar"."MissionFollowUpStatus" AS ENUM (
  'NOT_STARTED',
  'ACTIVE',
  'READY_TO_CLOSE',
  'CLOSED'
);

CREATE TYPE "kelly_calendar"."MissionFollowUpActionStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'BLOCKED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "kelly_calendar"."MissionFollowUpPriority" AS ENUM (
  'NORMAL',
  'IMPORTANT',
  'URGENT'
);

CREATE TYPE "kelly_calendar"."MissionFollowUpSourceType" AS ENUM (
  'EXECUTE_COMMITMENT',
  'EXECUTE_IMMEDIATE_FOLLOW_UP',
  'PERSON_RELATIONSHIP_NEXT_STEP',
  'ORGANIZATION_RELATIONSHIP_NEXT_STEP',
  'UNRESOLVED_QUESTION',
  'SUCCESS_CRITERION_RECOVERY',
  'LESSON_ACTION',
  'DEBRIEF_RECOMMENDED_ACTION',
  'OPERATOR_ADDED'
);

CREATE TYPE "kelly_calendar"."MissionFollowUpOwnerType" AS ENUM (
  'USER',
  'ROLE',
  'EXTERNAL',
  'UNASSIGNED'
);

CREATE TABLE "kelly_calendar"."MissionFollowUp" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "followUpStatus" "kelly_calendar"."MissionFollowUpStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "closeoutSummary" TEXT,
  "unresolvedSummary" TEXT,
  "internalNotes" TEXT,
  "startedByUserId" TEXT,
  "closedByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionFollowUp_missionId_key"
  ON "kelly_calendar"."MissionFollowUp"("missionId");

CREATE INDEX "MissionFollowUp_followUpStatus_idx"
  ON "kelly_calendar"."MissionFollowUp"("followUpStatus");

ALTER TABLE "kelly_calendar"."MissionFollowUp"
  ADD CONSTRAINT "MissionFollowUp_missionId_fkey"
  FOREIGN KEY ("missionId")
  REFERENCES "kelly_calendar"."CampaignMission"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE TABLE "kelly_calendar"."MissionFollowUpAction" (
  "id" TEXT NOT NULL,
  "followUpId" TEXT NOT NULL,
  "sourceType" "kelly_calendar"."MissionFollowUpSourceType" NOT NULL,
  "sourceRecordId" TEXT,
  "importKey" TEXT,
  "sourceSnapshot" JSONB,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "kelly_calendar"."MissionFollowUpActionStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "kelly_calendar"."MissionFollowUpPriority" NOT NULL DEFAULT 'NORMAL',
  "ownerType" "kelly_calendar"."MissionFollowUpOwnerType" NOT NULL DEFAULT 'UNASSIGNED',
  "ownerUserId" TEXT,
  "ownerName" TEXT,
  "ownerRole" TEXT,
  "relatedPersonName" TEXT,
  "relatedOrganizationName" TEXT,
  "dueAt" TIMESTAMP(3),
  "nextCheckAt" TIMESTAMP(3),
  "waitingReason" TEXT,
  "blockedReason" TEXT,
  "completionSummary" TEXT,
  "completionEvidence" JSONB NOT NULL DEFAULT '[]',
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "completedByUserId" TEXT,
  "cancelledByUserId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MissionFollowUpAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionFollowUpAction_followUpId_importKey_key"
  ON "kelly_calendar"."MissionFollowUpAction"("followUpId", "importKey");

CREATE INDEX "MissionFollowUpAction_followUpId_status_idx"
  ON "kelly_calendar"."MissionFollowUpAction"("followUpId", "status");

CREATE INDEX "MissionFollowUpAction_status_dueAt_idx"
  ON "kelly_calendar"."MissionFollowUpAction"("status", "dueAt");

CREATE INDEX "MissionFollowUpAction_sourceType_idx"
  ON "kelly_calendar"."MissionFollowUpAction"("sourceType");

ALTER TABLE "kelly_calendar"."MissionFollowUpAction"
  ADD CONSTRAINT "MissionFollowUpAction_followUpId_fkey"
  FOREIGN KEY ("followUpId")
  REFERENCES "kelly_calendar"."MissionFollowUp"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
