-- V2.1 Morning Launch Review — CampaignDayLaunchReview + CampaignDayLaunchAcknowledgement
-- Owned schema only: kelly_calendar
-- Additive / non-destructive. Lazy create — zero fabricated launch or acknowledgement rows.

CREATE TYPE "kelly_calendar"."CampaignDayLaunchStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'REVIEWED',
  'LAUNCHED'
);

CREATE TYPE "kelly_calendar"."CampaignDayLaunchReadiness" AS ENUM (
  'NOT_ASSESSED',
  'READY',
  'READY_WITH_ACCEPTED_RISK',
  'NOT_READY',
  'NO_MISSIONS_SCHEDULED'
);

CREATE TYPE "kelly_calendar"."CampaignDayLaunchAcknowledgementType" AS ENUM (
  'OVERNIGHT_CHANGE',
  'CARRY_FORWARD',
  'FIRST_MISSION_PREPARATION',
  'TRAVEL',
  'SCHEDULE_CONFLICT',
  'DUE_COMMITMENT',
  'LEADERSHIP_DECISION',
  'MATERIALS',
  'PEOPLE_BRIEF',
  'ORGANIZATION_BRIEF',
  'DATA_INTEGRITY',
  'OPERATOR_ADDED'
);

CREATE TYPE "kelly_calendar"."CampaignDayLaunchSourceType" AS ENUM (
  'PRIOR_DAY_CLOSEOUT',
  'CARRY_FORWARD_ITEM',
  'CAMPAIGN_MISSION',
  'MISSION_PREPARATION',
  'MISSION_EXECUTION',
  'MISSION_DEBRIEF',
  'MISSION_FOLLOW_UP',
  'EVENT',
  'COMMAND_CENTER_RULE',
  'OPERATOR_ADDED'
);

CREATE TYPE "kelly_calendar"."CampaignDayLaunchAcknowledgementStatus" AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'ACCEPTED_RISK',
  'RESOLVED',
  'NOT_APPLICABLE'
);

CREATE TABLE "kelly_calendar"."CampaignDayLaunchReview" (
  "id" TEXT NOT NULL,
  "campaignDateKey" TEXT NOT NULL,
  "status" "kelly_calendar"."CampaignDayLaunchStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "readinessAssessment" "kelly_calendar"."CampaignDayLaunchReadiness" NOT NULL DEFAULT 'NOT_ASSESSED',
  "launchSummary" TEXT,
  "overnightChangeNotes" TEXT,
  "acceptedRiskSummary" TEXT,
  "internalNotes" TEXT,
  "startedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "launchedAt" TIMESTAMP(3),
  "startedByUserId" TEXT,
  "reviewedByUserId" TEXT,
  "launchedByUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignDayLaunchReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignDayLaunchReview_campaignDateKey_key"
  ON "kelly_calendar"."CampaignDayLaunchReview"("campaignDateKey");

CREATE INDEX "CampaignDayLaunchReview_status_idx"
  ON "kelly_calendar"."CampaignDayLaunchReview"("status");

CREATE TABLE "kelly_calendar"."CampaignDayLaunchAcknowledgement" (
  "id" TEXT NOT NULL,
  "launchReviewId" TEXT NOT NULL,
  "acknowledgementType" "kelly_calendar"."CampaignDayLaunchAcknowledgementType" NOT NULL,
  "sourceType" "kelly_calendar"."CampaignDayLaunchSourceType" NOT NULL,
  "sourceRecordId" TEXT,
  "importKey" TEXT,
  "missionId" TEXT,
  "title" TEXT NOT NULL,
  "status" "kelly_calendar"."CampaignDayLaunchAcknowledgementStatus" NOT NULL DEFAULT 'OPEN',
  "acknowledgementNote" TEXT,
  "acceptedRiskReason" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignDayLaunchAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignDayLaunchAcknowledgement_launchReviewId_importKey_key"
  ON "kelly_calendar"."CampaignDayLaunchAcknowledgement"("launchReviewId", "importKey");

CREATE INDEX "CampaignDayLaunchAcknowledgement_launchReviewId_status_idx"
  ON "kelly_calendar"."CampaignDayLaunchAcknowledgement"("launchReviewId", "status");

CREATE INDEX "CampaignDayLaunchAcknowledgement_acknowledgementType_idx"
  ON "kelly_calendar"."CampaignDayLaunchAcknowledgement"("acknowledgementType");

ALTER TABLE "kelly_calendar"."CampaignDayLaunchAcknowledgement"
  ADD CONSTRAINT "CampaignDayLaunchAcknowledgement_launchReviewId_fkey"
  FOREIGN KEY ("launchReviewId")
  REFERENCES "kelly_calendar"."CampaignDayLaunchReview"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
