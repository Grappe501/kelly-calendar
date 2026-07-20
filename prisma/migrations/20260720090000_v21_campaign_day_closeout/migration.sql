-- V2.1 Campaign Day Closeout — CampaignDayCloseout + CampaignDayCarryForwardItem
-- Owned schema only: kelly_calendar
-- Additive / non-destructive. Lazy create — zero fabricated closeout or carry-forward rows.

CREATE TYPE "kelly_calendar"."CampaignDayCloseoutStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'REVIEWED',
  'SIGNED_OFF'
);

CREATE TYPE "kelly_calendar"."CampaignDayAssessment" AS ENUM (
  'NOT_ASSESSED',
  'CLEAR',
  'RESPONSIBILITY_REMAINS',
  'LEADERSHIP_ACTION_REQUIRED'
);

CREATE TYPE "kelly_calendar"."TomorrowReadinessStatus" AS ENUM (
  'NOT_ASSESSED',
  'READY',
  'NEEDS_ATTENTION',
  'NOT_READY',
  'NO_MISSIONS_SCHEDULED'
);

CREATE TYPE "kelly_calendar"."CampaignDayCarryForwardSourceType" AS ENUM (
  'ACTIVE_EXECUTION',
  'DEBRIEF_REQUIRED',
  'DEBRIEF_APPROVAL',
  'FOLLOW_UP_ACTION',
  'COMMITMENT',
  'BLOCKED_ACTION',
  'UNASSIGNED_ACTION',
  'LEADERSHIP_DECISION',
  'TOMORROW_PREPARATION',
  'TOMORROW_TRAVEL',
  'TOMORROW_SCHEDULE',
  'DATA_INTEGRITY',
  'OPERATOR_ADDED'
);

CREATE TYPE "kelly_calendar"."CampaignDayCarryForwardStatus" AS ENUM (
  'OPEN',
  'TRANSFERRED',
  'RESOLVED',
  'CANCELLED'
);

CREATE TABLE "kelly_calendar"."CampaignDayCloseout" (
  "id" TEXT NOT NULL,
  "campaignDateKey" TEXT NOT NULL,
  "status" "kelly_calendar"."CampaignDayCloseoutStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "todayAssessment" "kelly_calendar"."CampaignDayAssessment" NOT NULL DEFAULT 'NOT_ASSESSED',
  "tomorrowReadiness" "kelly_calendar"."TomorrowReadinessStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
  "closeoutSummary" TEXT,
  "carryForwardSummary" TEXT,
  "tomorrowSummary" TEXT,
  "internalNotes" TEXT,
  "startedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "signedOffAt" TIMESTAMP(3),
  "startedByUserId" TEXT,
  "reviewedByUserId" TEXT,
  "signedOffByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignDayCloseout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignDayCloseout_campaignDateKey_key"
  ON "kelly_calendar"."CampaignDayCloseout"("campaignDateKey");

CREATE INDEX "CampaignDayCloseout_status_idx"
  ON "kelly_calendar"."CampaignDayCloseout"("status");

CREATE TABLE "kelly_calendar"."CampaignDayCarryForwardItem" (
  "id" TEXT NOT NULL,
  "closeoutId" TEXT NOT NULL,
  "sourceType" "kelly_calendar"."CampaignDayCarryForwardSourceType" NOT NULL,
  "sourceRecordId" TEXT,
  "importKey" TEXT,
  "missionId" TEXT,
  "title" TEXT NOT NULL,
  "reason" TEXT,
  "ownerName" TEXT,
  "ownerUserId" TEXT,
  "targetDateKey" TEXT,
  "destination" TEXT,
  "status" "kelly_calendar"."CampaignDayCarryForwardStatus" NOT NULL DEFAULT 'OPEN',
  "createdByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" TEXT,
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignDayCarryForwardItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignDayCarryForwardItem_closeoutId_importKey_key"
  ON "kelly_calendar"."CampaignDayCarryForwardItem"("closeoutId", "importKey");

CREATE INDEX "CampaignDayCarryForwardItem_closeoutId_status_idx"
  ON "kelly_calendar"."CampaignDayCarryForwardItem"("closeoutId", "status");

CREATE INDEX "CampaignDayCarryForwardItem_sourceType_idx"
  ON "kelly_calendar"."CampaignDayCarryForwardItem"("sourceType");

ALTER TABLE "kelly_calendar"."CampaignDayCarryForwardItem"
  ADD CONSTRAINT "CampaignDayCarryForwardItem_closeoutId_fkey"
  FOREIGN KEY ("closeoutId")
  REFERENCES "kelly_calendar"."CampaignDayCloseout"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
