-- IC-02D Volunteer Operations and Campaign Work Management (ADR-108)
-- Additive. No people, volunteers, assignments, Events, or Missions seeded.

DO $$ BEGIN CREATE TYPE "kelly_calendar"."CampaignVolunteerLifecycleStatus" AS ENUM ('PROSPECT','INTAKE_NEEDED','ONBOARDING','READY','ACTIVE','PAUSED','INACTIVE','DO_NOT_ASSIGN','ENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."CampaignVolunteerSkillLevel" AS ENUM ('INTERESTED','BEGINNER','EXPERIENCED','TRAINER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."CampaignVolunteerAssignmentStatus" AS ENUM ('PROPOSED','INVITED','ASSIGNED','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','DECLINED','NO_SHOW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."CampaignVolunteerNoteClassification" AS ENUM ('OPERATIONAL','RESTRICTED','LEADERSHIP_ONLY','CONSENT_PRIVACY_SENSITIVE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kelly_calendar"."CampaignWorkSourceType" AS ENUM ('MISSION_ACTIVATION_TASK','MISSION_ACTIVATION_VOLUNTEER_NEED','MISSION_STAFFING_ASSIGNMENT','VOLUNTEER_ASSIGNMENT','MISSION_TRAVEL','MISSION_LOGISTICS','MISSION_FIELD_OPS','FOLLOW_UP','COMMUNICATION_QUEUE','TRAINING','MANUAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignVolunteerProfile" (
  "id" TEXT NOT NULL,
  "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "localPersonId" TEXT NOT NULL,
  "preferredDisplayName" TEXT NOT NULL,
  "lifecycleStatus" "kelly_calendar"."CampaignVolunteerLifecycleStatus" NOT NULL DEFAULT 'PROSPECT',
  "arkansasCountyId" TEXT,
  "geographicServiceNote" TEXT,
  "remoteOk" BOOLEAN NOT NULL DEFAULT true,
  "inPersonOk" BOOLEAN NOT NULL DEFAULT true,
  "travelWillingness" TEXT,
  "accessibilityNotes" TEXT,
  "leadershipInterest" BOOLEAN NOT NULL DEFAULT false,
  "preferredWorkTypesJson" JSONB NOT NULL DEFAULT '[]',
  "supervisorLabel" TEXT,
  "lastMeaningfulActionAt" TIMESTAMP(3),
  "nextRecommendedAction" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignVolunteerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignVolunteerProfile_campaignScopeKey_localPersonId_key" ON "kelly_calendar"."CampaignVolunteerProfile"("campaignScopeKey","localPersonId");
CREATE INDEX IF NOT EXISTS "CampaignVolunteerProfile_campaignScopeKey_lifecycleStatus_idx" ON "kelly_calendar"."CampaignVolunteerProfile"("campaignScopeKey","lifecycleStatus");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignVolunteerInterest" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "profileId" TEXT NOT NULL,
  "interestKey" TEXT NOT NULL, "label" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignVolunteerInterest_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignVolunteerInterest_profileId_interestKey_key" ON "kelly_calendar"."CampaignVolunteerInterest"("profileId","interestKey");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignVolunteerSkill" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "profileId" TEXT NOT NULL,
  "skillKey" TEXT NOT NULL, "label" TEXT NOT NULL,
  "level" "kelly_calendar"."CampaignVolunteerSkillLevel" NOT NULL DEFAULT 'INTERESTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignVolunteerSkill_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignVolunteerSkill_profileId_skillKey_key" ON "kelly_calendar"."CampaignVolunteerSkill"("profileId","skillKey");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignVolunteerAvailability" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "profileId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'RECURRING', "weekday" INTEGER, "startLocalTime" TEXT, "endLocalTime" TEXT,
  "specificDate" TIMESTAMP(3), "unavailable" BOOLEAN NOT NULL DEFAULT false,
  "remoteOk" BOOLEAN, "inPersonOk" BOOLEAN, "travelRadiusMiles" INTEGER, "willingToDrive" BOOLEAN,
  "maxFrequencyNote" TEXT, "reviewBy" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignVolunteerAvailability_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "CampaignVolunteerAvailability_profileId_idx" ON "kelly_calendar"."CampaignVolunteerAvailability"("profileId");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignVolunteerTraining" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "profileId" TEXT NOT NULL,
  "trainingKey" TEXT NOT NULL, "title" TEXT NOT NULL, "completedAt" TIMESTAMP(3), "completedByUserId" TEXT,
  "evidenceNote" TEXT, "externalLink" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignVolunteerTraining_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignVolunteerTraining_profileId_trainingKey_key" ON "kelly_calendar"."CampaignVolunteerTraining"("profileId","trainingKey");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignVolunteerPreference" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "profileId" TEXT NOT NULL,
  "preferenceKey" TEXT NOT NULL, "valueJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignVolunteerPreference_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignVolunteerPreference_profileId_preferenceKey_key" ON "kelly_calendar"."CampaignVolunteerPreference"("profileId","preferenceKey");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignVolunteerNote" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "profileId" TEXT NOT NULL,
  "classification" "kelly_calendar"."CampaignVolunteerNoteClassification" NOT NULL DEFAULT 'OPERATIONAL',
  "body" TEXT NOT NULL, "createdByUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignVolunteerNote_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "CampaignVolunteerNote_profileId_classification_idx" ON "kelly_calendar"."CampaignVolunteerNote"("profileId","classification");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignVolunteerStatusHistory" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "profileId" TEXT NOT NULL,
  "fromStatus" "kelly_calendar"."CampaignVolunteerLifecycleStatus",
  "toStatus" "kelly_calendar"."CampaignVolunteerLifecycleStatus" NOT NULL,
  "reason" TEXT, "actorUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignVolunteerStatusHistory_pkey" PRIMARY KEY ("id"));
CREATE INDEX IF NOT EXISTS "CampaignVolunteerStatusHistory_profileId_createdAt_idx" ON "kelly_calendar"."CampaignVolunteerStatusHistory"("profileId","createdAt");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignVolunteerAssignment" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY', "profileId" TEXT NOT NULL,
  "status" "kelly_calendar"."CampaignVolunteerAssignmentStatus" NOT NULL DEFAULT 'PROPOSED',
  "opportunityTitle" TEXT NOT NULL, "whyItMatters" TEXT, "definitionOfDone" TEXT,
  "missionId" TEXT, "eventId" TEXT, "activationVolunteerNeedId" TEXT, "staffingAssignmentId" TEXT,
  "departmentKey" TEXT, "geographyNote" TEXT, "remoteOrInPerson" TEXT,
  "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "estimatedMinutes" INTEGER, "supervisorLabel" TEXT,
  "privacyLevel" TEXT NOT NULL DEFAULT 'INTERNAL',
  "proposedByUserId" TEXT, "confirmedAt" TIMESTAMP(3), "confirmedByUserId" TEXT,
  "checkedInAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
  "declineReason" TEXT, "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignVolunteerAssignment_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignVolunteerAssignment_campaignScopeKey_idempotencyKey_key" ON "kelly_calendar"."CampaignVolunteerAssignment"("campaignScopeKey","idempotencyKey");
CREATE INDEX IF NOT EXISTS "CampaignVolunteerAssignment_profileId_status_idx" ON "kelly_calendar"."CampaignVolunteerAssignment"("profileId","status");
CREATE INDEX IF NOT EXISTS "CampaignVolunteerAssignment_missionId_status_idx" ON "kelly_calendar"."CampaignVolunteerAssignment"("missionId","status");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignWorkItemIndex" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "sourceType" "kelly_calendar"."CampaignWorkSourceType" NOT NULL, "sourceRecordId" TEXT NOT NULL,
  "title" TEXT NOT NULL, "missionId" TEXT, "eventId" TEXT, "departmentKey" TEXT,
  "accountablePositionKey" TEXT, "assigneeUserId" TEXT, "geographyNote" TEXT,
  "dueAt" TIMESTAMP(3), "status" TEXT NOT NULL, "priorityTierHint" INTEGER,
  "privacyLevel" TEXT NOT NULL DEFAULT 'INTERNAL', "sourceHref" TEXT NOT NULL, "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignWorkItemIndex_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignWorkItemIndex_campaignScopeKey_sourceType_sourceRecordId_key" ON "kelly_calendar"."CampaignWorkItemIndex"("campaignScopeKey","sourceType","sourceRecordId");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."CampaignTrainingCatalogItem" (
  "id" TEXT NOT NULL, "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
  "trainingKey" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignTrainingCatalogItem_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignTrainingCatalogItem_campaignScopeKey_trainingKey_key" ON "kelly_calendar"."CampaignTrainingCatalogItem"("campaignScopeKey","trainingKey");

DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignVolunteerProfile" ADD CONSTRAINT "CampaignVolunteerProfile_localPersonId_fkey" FOREIGN KEY ("localPersonId") REFERENCES "kelly_calendar"."Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignVolunteerInterest" ADD CONSTRAINT "CampaignVolunteerInterest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "kelly_calendar"."CampaignVolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignVolunteerSkill" ADD CONSTRAINT "CampaignVolunteerSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "kelly_calendar"."CampaignVolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignVolunteerAvailability" ADD CONSTRAINT "CampaignVolunteerAvailability_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "kelly_calendar"."CampaignVolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignVolunteerTraining" ADD CONSTRAINT "CampaignVolunteerTraining_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "kelly_calendar"."CampaignVolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignVolunteerPreference" ADD CONSTRAINT "CampaignVolunteerPreference_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "kelly_calendar"."CampaignVolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignVolunteerNote" ADD CONSTRAINT "CampaignVolunteerNote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "kelly_calendar"."CampaignVolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignVolunteerStatusHistory" ADD CONSTRAINT "CampaignVolunteerStatusHistory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "kelly_calendar"."CampaignVolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "kelly_calendar"."CampaignVolunteerAssignment" ADD CONSTRAINT "CampaignVolunteerAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "kelly_calendar"."CampaignVolunteerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
