-- IC-02A Event Outcome and Hot Wash (ADR-105)
-- Additive only. No seeded reviews, no Event/Mission status conversion,
-- no fabricated attendance/people/consents.

DO $$ BEGIN
  CREATE TYPE "kelly_calendar"."EventOutcomeReviewStatus" AS ENUM ('DRAFT', 'REVIEWED', 'STALE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "kelly_calendar"."EventAttendanceOutcome" AS ENUM (
    'ATTENDED', 'PARTIALLY_ATTENDED', 'NOT_ATTENDED', 'CANCELLED', 'POSTPONED',
    'EVENT_DID_NOT_OCCUR', 'UNKNOWN', 'NOT_APPLICABLE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "kelly_calendar"."EventOperationalOutcome" AS ENUM (
    'COMPLETED', 'PARTIALLY_COMPLETED', 'UNSUCCESSFUL', 'RESCHEDULE_NEEDED',
    'FOLLOW_UP_REQUIRED', 'NO_CAMPAIGN_ACTION', 'UNKNOWN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "kelly_calendar"."EventHotWashEntryType" AS ENUM (
    'WHAT_HAPPENED', 'TAKEAWAY', 'WIN', 'CHALLENGE', 'COMMITMENT', 'FOLLOW_UP',
    'CONTACT_ENCOUNTER', 'ORGANIZATION_ENCOUNTER', 'ISSUE', 'CORRECTION', 'NOTE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "kelly_calendar"."EventOutcomePrivacyClass" AS ENUM ('INTERNAL', 'LEADERSHIP', 'CONFIDENTIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "kelly_calendar"."EventEncounterContactReviewStatus" AS ENUM (
    'NOT_REQUESTED', 'AWAITING_REVIEW', 'DECLINED', 'CONVERTED_TO_CONTACT_WORKFLOW'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "kelly_calendar"."EventOutcomeReview" (
    "id" TEXT NOT NULL,
    "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
    "eventId" TEXT NOT NULL,
    "campaignDateKey" TEXT NOT NULL,
    "status" "kelly_calendar"."EventOutcomeReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "attendanceOutcome" "kelly_calendar"."EventAttendanceOutcome",
    "operationalOutcome" "kelly_calendar"."EventOperationalOutcome",
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "summary" TEXT,
    "whatHappened" TEXT,
    "attendanceEstimate" INTEGER,
    "notableIssues" TEXT,
    "missionWorkNeeded" BOOLEAN NOT NULL DEFAULT false,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFingerprint" TEXT NOT NULL,
    "sourceFingerprint" TEXT,
    "staleAt" TIMESTAMP(3),
    "staleReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "EventOutcomeReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventOutcomeReview_eventId_key"
  ON "kelly_calendar"."EventOutcomeReview"("eventId");

CREATE INDEX IF NOT EXISTS "EventOutcomeReview_campaignScopeKey_status_idx"
  ON "kelly_calendar"."EventOutcomeReview"("campaignScopeKey", "status");

CREATE INDEX IF NOT EXISTS "EventOutcomeReview_campaignScopeKey_campaignDateKey_idx"
  ON "kelly_calendar"."EventOutcomeReview"("campaignScopeKey", "campaignDateKey");

CREATE INDEX IF NOT EXISTS "EventOutcomeReview_attendanceOutcome_idx"
  ON "kelly_calendar"."EventOutcomeReview"("attendanceOutcome");

CREATE INDEX IF NOT EXISTS "EventOutcomeReview_operationalOutcome_idx"
  ON "kelly_calendar"."EventOutcomeReview"("operationalOutcome");

CREATE INDEX IF NOT EXISTS "EventOutcomeReview_reviewedAt_idx"
  ON "kelly_calendar"."EventOutcomeReview"("reviewedAt");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."EventHotWashEntry" (
    "id" TEXT NOT NULL,
    "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
    "outcomeReviewId" TEXT NOT NULL,
    "entryType" "kelly_calendar"."EventHotWashEntryType" NOT NULL,
    "content" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3),
    "authorUserId" TEXT,
    "privacyClassification" "kelly_calendar"."EventOutcomePrivacyClass" NOT NULL DEFAULT 'INTERNAL',
    "correctsEntryId" TEXT,
    "sourceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "EventHotWashEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventHotWashEntry_outcomeReviewId_entryType_idx"
  ON "kelly_calendar"."EventHotWashEntry"("outcomeReviewId", "entryType");

CREATE INDEX IF NOT EXISTS "EventHotWashEntry_campaignScopeKey_createdAt_idx"
  ON "kelly_calendar"."EventHotWashEntry"("campaignScopeKey", "createdAt");

CREATE INDEX IF NOT EXISTS "EventHotWashEntry_archivedAt_idx"
  ON "kelly_calendar"."EventHotWashEntry"("archivedAt");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."EventEncounter" (
    "id" TEXT NOT NULL,
    "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
    "outcomeReviewId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "organizationName" TEXT,
    "roleTitle" TEXT,
    "meetingContext" TEXT,
    "whyItMatters" TEXT,
    "campaignCommitments" TEXT,
    "personCommitments" TEXT,
    "suggestedNextAction" TEXT,
    "followUpDueAt" TIMESTAMP(3),
    "privacyClassification" "kelly_calendar"."EventOutcomePrivacyClass" NOT NULL DEFAULT 'INTERNAL',
    "contactDetailsProvided" BOOLEAN NOT NULL DEFAULT false,
    "contactReviewStatus" "kelly_calendar"."EventEncounterContactReviewStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "linkedPersonId" TEXT,
    "linkedOrganizationId" TEXT,
    "externalReference" TEXT,
    "recordedByUserId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "EventEncounter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventEncounter_outcomeReviewId_idx"
  ON "kelly_calendar"."EventEncounter"("outcomeReviewId");

CREATE INDEX IF NOT EXISTS "EventEncounter_campaignScopeKey_contactReviewStatus_idx"
  ON "kelly_calendar"."EventEncounter"("campaignScopeKey", "contactReviewStatus");

CREATE INDEX IF NOT EXISTS "EventEncounter_linkedPersonId_idx"
  ON "kelly_calendar"."EventEncounter"("linkedPersonId");

CREATE INDEX IF NOT EXISTS "EventEncounter_archivedAt_idx"
  ON "kelly_calendar"."EventEncounter"("archivedAt");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."EventOutcomeFollowUpLink" (
    "id" TEXT NOT NULL,
    "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
    "outcomeReviewId" TEXT NOT NULL,
    "hotWashEntryId" TEXT,
    "encounterId" TEXT,
    "eventFollowupId" TEXT NOT NULL,
    "reason" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOutcomeFollowUpLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventOutcomeFollowUpLink_outcomeReviewId_eventFollowupId_key"
  ON "kelly_calendar"."EventOutcomeFollowUpLink"("outcomeReviewId", "eventFollowupId");

CREATE INDEX IF NOT EXISTS "EventOutcomeFollowUpLink_campaignScopeKey_idx"
  ON "kelly_calendar"."EventOutcomeFollowUpLink"("campaignScopeKey");

CREATE TABLE IF NOT EXISTS "kelly_calendar"."EventOutcomeAuditEntry" (
    "id" TEXT NOT NULL,
    "campaignScopeKey" TEXT NOT NULL DEFAULT 'KELLY',
    "outcomeReviewId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "detailJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventOutcomeAuditEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventOutcomeAuditEntry_outcomeReviewId_createdAt_idx"
  ON "kelly_calendar"."EventOutcomeAuditEntry"("outcomeReviewId", "createdAt");

CREATE INDEX IF NOT EXISTS "EventOutcomeAuditEntry_campaignScopeKey_action_idx"
  ON "kelly_calendar"."EventOutcomeAuditEntry"("campaignScopeKey", "action");

DO $$ BEGIN
  ALTER TABLE "kelly_calendar"."EventOutcomeReview"
    ADD CONSTRAINT "EventOutcomeReview_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "kelly_calendar"."Event"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "kelly_calendar"."EventHotWashEntry"
    ADD CONSTRAINT "EventHotWashEntry_outcomeReviewId_fkey"
    FOREIGN KEY ("outcomeReviewId") REFERENCES "kelly_calendar"."EventOutcomeReview"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "kelly_calendar"."EventHotWashEntry"
    ADD CONSTRAINT "EventHotWashEntry_correctsEntryId_fkey"
    FOREIGN KEY ("correctsEntryId") REFERENCES "kelly_calendar"."EventHotWashEntry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "kelly_calendar"."EventEncounter"
    ADD CONSTRAINT "EventEncounter_outcomeReviewId_fkey"
    FOREIGN KEY ("outcomeReviewId") REFERENCES "kelly_calendar"."EventOutcomeReview"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "kelly_calendar"."EventEncounter"
    ADD CONSTRAINT "EventEncounter_linkedPersonId_fkey"
    FOREIGN KEY ("linkedPersonId") REFERENCES "kelly_calendar"."Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "kelly_calendar"."EventOutcomeFollowUpLink"
    ADD CONSTRAINT "EventOutcomeFollowUpLink_outcomeReviewId_fkey"
    FOREIGN KEY ("outcomeReviewId") REFERENCES "kelly_calendar"."EventOutcomeReview"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "kelly_calendar"."EventOutcomeFollowUpLink"
    ADD CONSTRAINT "EventOutcomeFollowUpLink_hotWashEntryId_fkey"
    FOREIGN KEY ("hotWashEntryId") REFERENCES "kelly_calendar"."EventHotWashEntry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "kelly_calendar"."EventOutcomeFollowUpLink"
    ADD CONSTRAINT "EventOutcomeFollowUpLink_encounterId_fkey"
    FOREIGN KEY ("encounterId") REFERENCES "kelly_calendar"."EventEncounter"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "kelly_calendar"."EventOutcomeAuditEntry"
    ADD CONSTRAINT "EventOutcomeAuditEntry_outcomeReviewId_fkey"
    FOREIGN KEY ("outcomeReviewId") REFERENCES "kelly_calendar"."EventOutcomeReview"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
